import os
import json
import random
import io
import re
import asyncio
from typing import Optional, List
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

import pypdf

from supabase.client import Client, create_client
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

load_dotenv()

app = FastAPI()

# ── CORS: configurable via env var, falls back to wildcard for local dev ──
_frontend_url = os.getenv("FRONTEND_URL", "*")
_cors_origins = [x.strip() for x in _frontend_url.split(",")] if "," in _frontend_url else [_frontend_url]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Cached Supabase client ──
_supabase_client: Optional[Client] = None
_supabase_url: Optional[str] = None
_supabase_key: Optional[str] = None

def get_supabase_client() -> Client:
    global _supabase_client, _supabase_url, _supabase_key
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise ValueError("Missing Supabase URL or Service Key. Check .env")
    if _supabase_client is None or url != _supabase_url or key != _supabase_key:
        _supabase_client = create_client(url, key)
        _supabase_url = url
        _supabase_key = key
    return _supabase_client


class QueryRequest(BaseModel):
    query: str
    history: Optional[list] = []
    user_id: Optional[str] = None

class MCQRequest(BaseModel):
    query: str
    context_summary: str = ""

class FlashcardRequest(BaseModel):
    text: str


def get_embedding_api_keys():
    api_keys = []
    primary_key = os.getenv("GEMINI_API_KEY")
    if primary_key:
        api_keys.append(primary_key)
    for i in range(1, 10):
        key = os.getenv(f"EXTRA_API_KEY_{i}")
        if key:
            api_keys.append(key)
    return api_keys

def get_chat_api_keys():
    chat_keys = []
    primary_chat_key = os.getenv("CHAT_GEMINI_API_KEY")
    if primary_chat_key:
        chat_keys.append(primary_chat_key)
    for key in get_embedding_api_keys():
        if key not in chat_keys:
            chat_keys.append(key)
    return chat_keys

def get_env_vars():
    embedding_api_keys = get_embedding_api_keys()
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
    if not embedding_api_keys or not all([supabase_url, supabase_key]):
        raise ValueError("Missing API Keys. Please check .env")
    return embedding_api_keys, supabase_url, supabase_key

def get_ordered_embedding_api_keys():
    api_keys, supabase_url, supabase_key = get_env_vars()
    shuffled = list(api_keys)
    random.shuffle(shuffled)
    return shuffled, supabase_url, supabase_key

def get_ordered_chat_api_keys():
    _, supabase_url, supabase_key = get_env_vars()
    chat_keys = get_chat_api_keys()
    if not chat_keys:
        raise ValueError("Missing chat API key configuration. Please check .env")
    primary = chat_keys[0]
    fallback_keys = list(chat_keys[1:])
    random.shuffle(fallback_keys)
    return [primary] + fallback_keys, supabase_url, supabase_key

def is_embedding_permission_error(error: Exception | str) -> bool:
    message = str(error)
    normalized = message.upper()
    return (
        "PERMISSION_DENIED" in normalized
        or "DENIED ACCESS" in normalized
        or "PROJECT HAS BEEN DENIED ACCESS" in normalized
        or "ERROR EMBEDDING CONTENT" in normalized
    )

def invoke_llm_with_fallback(prompt: str, api_key: str):
    try:
        llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=api_key,
            temperature=0.3,
            max_retries=0,
        )
        return llm.invoke(prompt)
    except Exception as e:
        print(f"gemini-2.5-flash failed ({e}). Falling back to gemini-2.0-flash...")
        try:
            llm_fallback = ChatGoogleGenerativeAI(
                model="gemini-2.0-flash",
                google_api_key=api_key,
                temperature=0.3,
                max_retries=0,
            )
            return llm_fallback.invoke(prompt)
        except Exception as e2:
            raise RuntimeError(f"Both LLM models failed. gemini-2.5-flash: {e} | gemini-2.0-flash: {e2}")

def invoke_llm_with_key_pool(prompt: str, api_keys: list[str]):
    last_error = None
    for api_key in api_keys:
        try:
            return invoke_llm_with_fallback(prompt, api_key)
        except Exception as e:
            last_error = str(e)
            continue
    raise RuntimeError(f"All chat API keys failed. Last error: {last_error}")


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "medai-rag-backend"}


@app.post("/query")
def query_knowledge_base(request: QueryRequest):
    embedding_api_keys, _, _ = get_ordered_embedding_api_keys()
    chat_api_keys, _, _ = get_ordered_chat_api_keys()

    supabase = get_supabase_client()
    last_error = None
    embedding_access_denied = False

    for api_key in embedding_api_keys:
        try:
            embeddings = GoogleGenerativeAIEmbeddings(
                model="models/gemini-embedding-2",
                google_api_key=api_key,
                output_dimensionality=768,
                max_retries=0
            )

            query_embedding = embeddings.embed_query(request.query)

            response_global = supabase.rpc("match_documents", {"query_embedding": query_embedding, "match_count": 6}).execute()
            docs_global = response_global.data if response_global.data else []

            docs_user = []
            if request.user_id:
                response_user = supabase.rpc("match_user_documents", {
                    "query_embedding": query_embedding,
                    "match_count": 4,
                    "p_user_id": request.user_id
                }).execute()
                docs_user = response_user.data if response_user.data else []

            all_docs = docs_global + docs_user

            context_parts = []
            sources_list = []
            if all_docs:
                for doc in all_docs:
                    meta = doc.get("metadata", {})
                    source = meta.get('source_book', 'Unknown Source')
                    content = doc.get("content", "")
                    context_parts.append(f"[Source: {source}]\n{content}")
                    sources_list.append({
                        "content": content,
                        "source_book": source
                    })

            context = "\n\n".join(context_parts) if context_parts else "No specific context found. If the user is just greeting you, say hello back and offer to help them study!"

            history_text = ""
            if request.history:
                history_text = "Previous Conversation:\n"
                for msg in request.history:
                    role = msg.get("role", "user")
                    content = msg.get("content", "")
                    history_text += f"{role.capitalize()}: {content}\n"
                history_text += "\n"

            prompt = f"""You are an expert medical AI assistant designed to generate high-quality, easy-to-study exam notes, and act as a friendly tutor.
Use the following pieces of retrieved context from medical textbooks and user uploads to answer the question.

CRITICAL INSTRUCTIONS:
1. If the user is just saying hello, "hey", or greeting you, warmly greet them back and ask how you can help them with their medical studies today! DO NOT generate exam notes for a simple greeting.
2. If it is a medical question, act like a highly helpful study buddy. Your goal is to generate clean, structured, and highly readable exam notes.
3. Use clear, bold headings to organize the information logically.
4. Use concise bullet points for everything. Avoid big, overwhelming walls of text.
5. Bold the most important keywords and high-yield concepts so they are easy to scan and memorize.
6. Keep the language simple and easy to understand.
7. If applicable, draw text-based flowcharts using characters (e.g., `├──` and `└──`) for pathogenesis or classifications.
8. If the retrieved context does not contain the answer, you SHOULD STILL ANSWER the question using your own general medical knowledge, but briefly mention that you are relying on general knowledge outside the textbooks.
9. Answer the user's latest Question, keeping in mind the Previous Conversation history if provided.

At the very end of your response, you MUST provide 3 suggested follow-up questions that the user could ask next to deepen their understanding.
Format them EXACTLY like this on new lines at the end of the text:
---SUGGESTIONS---
[Suggestion 1]
[Suggestion 2]
[Suggestion 3]

{history_text}
Context:
{context}

Question: {request.query}"""

            response = invoke_llm_with_key_pool(prompt, chat_api_keys)
            raw_content = response.content

            suggestions = []
            main_content = raw_content
            if "---SUGGESTIONS---" in raw_content:
                parts = raw_content.split("---SUGGESTIONS---")
                main_content = parts[0].strip()
                sug_text = parts[1].strip()
                for line in sug_text.split('\n'):
                    line = line.strip()
                    if re.match(r'^\d+\.', line):
                        suggestions.append(re.sub(r'^\d+\.\s*', '', line))

            return {"summary": main_content, "sources": sources_list, "suggestions": suggestions[:3]}

        except Exception as e:
            last_error = str(e)
            if is_embedding_permission_error(e):
                embedding_access_denied = True
                print(f"Embedding access denied for key: {last_error}")
            else:
                print(f"API Key failed: {last_error}. Retrying with next key...")
            continue

    if embedding_access_denied:
        llm_error = None
        for api_key in chat_api_keys:
            try:
                history_text = ""
                if request.history:
                    history_text = "Previous Conversation:\n"
                    for msg in request.history:
                        role = msg.get("role", "user")
                        content = msg.get("content", "")
                        history_text += f"{role.capitalize()}: {content}\n"
                    history_text += "\n"

                prompt = f"""You are an expert medical AI assistant designed to generate high-quality, easy-to-study exam notes, and act as a friendly tutor.
The textbook retrieval system is temporarily unavailable, so answer the question using reliable general medical knowledge only.

CRITICAL INSTRUCTIONS:
1. Clearly structure the answer with bold headings and concise bullet points.
2. Keep the language simple and exam-focused.
3. If the question is clinical or factual, do your best to answer accurately from general medical knowledge.
4. Briefly mention at the top that the answer is based on general knowledge because textbook retrieval is temporarily unavailable.
5. Answer the user's latest question, keeping prior conversation in mind if provided.

At the very end of your response, you MUST provide 3 suggested follow-up questions that the user could ask next to deepen their understanding.
Format them EXACTLY like this on new lines at the end of the text:
---SUGGESTIONS---
1. [Suggestion 1]
2. [Suggestion 2]
3. [Suggestion 3]

{history_text}
Question: {request.query}"""

                response = invoke_llm_with_fallback(prompt, api_key)
                raw_content = response.content
                suggestions = []
                main_content = raw_content
                if "---SUGGESTIONS---" in raw_content:
                    parts = raw_content.split("---SUGGESTIONS---")
                    main_content = parts[0].strip()
                    sug_text = parts[1].strip()
                    for line in sug_text.split('\n'):
                        line = line.strip()
                        if re.match(r'^\d+\.', line):
                            suggestions.append(re.sub(r'^\d+\.\s*', '', line))

                return {
                    "summary": main_content,
                    "sources": [],
                    "suggestions": suggestions[:3],
                }
            except Exception as e:
                llm_error = str(e)
                continue

        raise HTTPException(
            status_code=503,
            detail=(
                "Textbook retrieval is temporarily unavailable because the embedding project was denied access, "
                f"and fallback response generation also failed. Last error: {llm_error or last_error}"
            ),
        )

    raise HTTPException(status_code=503, detail=f"Embedding service unavailable. Last error: {last_error}")


@app.post("/generate_mcq")
def generate_mcq(request: MCQRequest):
    embedding_api_keys, _, _ = get_ordered_embedding_api_keys()
    chat_api_keys, _, _ = get_ordered_chat_api_keys()

    supabase = get_supabase_client()
    last_error = None

    for api_key in embedding_api_keys:
        try:
            embeddings = GoogleGenerativeAIEmbeddings(
                model="models/gemini-embedding-2",
                google_api_key=api_key,
                output_dimensionality=768,
                max_retries=0
            )

            # Use direct RPC instead of heavy LangChain vectorstore for ~2x speedup
            query_embedding = embeddings.embed_query(request.query)
            response = supabase.rpc("match_documents", {"query_embedding": query_embedding, "match_count": 10}).execute()
            docs = response.data if response.data else []

            context_parts = []
            for doc in docs:
                context_parts.append(doc.get("content", ""))

            context = "\n\n".join(context_parts)

            prompt = f"""You are a medical examiner. Generate exactly 5 multiple-choice questions (MCQs) based strictly on the following context.
The questions should test high-yield concepts from the provided topic. Provide exactly 4 options for each question.
You MUST return your answer as a raw JSON array of 5 objects. Each object must have the following exact keys: "question" (string), "options" (array of 4 strings), "correct_index" (integer 0-3), and "explanation" (string).
Do NOT wrap the JSON in markdown code blocks. Just output the raw JSON array.

Topic: {request.query}
Additional context summary: {request.context_summary}

Context:
{context}"""

            response = invoke_llm_with_key_pool(prompt, chat_api_keys)

            raw_text = response.content.strip()
            if raw_text.startswith("```json"):
                raw_text = raw_text[7:]
            if raw_text.startswith("```"):
                raw_text = raw_text[3:]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]
            raw_text = raw_text.strip()

            try:
                questions = json.loads(raw_text)
                if isinstance(questions, dict) and "questions" in questions:
                    return {"success": True, "questions": questions["questions"]}
                return {"success": True, "questions": questions}
            except json.JSONDecodeError:
                print(f"Failed to parse JSON from chat response after retrieval with embedding key {api_key[:10]}...")
                last_error = "LLM did not return valid JSON."
                continue

        except Exception as e:
            last_error = str(e)
            print(f"API Key failed: {last_error}. Retrying with next key...")
            continue

    raise HTTPException(status_code=500, detail=f"Failed to generate MCQ. Last error: {last_error}")


@app.post("/upload_pdf")
async def upload_pdf(user_id: str = Form(...), file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    try:
        content = await file.read()
        pdf_reader = pypdf.PdfReader(io.BytesIO(content))
        text = ""
        for page in pdf_reader.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted + "\n"

        if not text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from the PDF.")

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = text_splitter.split_text(text)

        embedding_api_keys, _, _ = get_ordered_embedding_api_keys()
        supabase = get_supabase_client()

        embedded_chunks = None
        last_error = None
        for api_key in embedding_api_keys:
            try:
                embeddings = GoogleGenerativeAIEmbeddings(
                    model="models/gemini-embedding-2",
                    google_api_key=api_key,
                    output_dimensionality=768,
                    max_retries=0
                )
                # Offload blocking embedding to thread pool so event loop stays responsive
                embedded_chunks = await asyncio.to_thread(embeddings.embed_documents, chunks)
                break
            except Exception as e:
                last_error = str(e)
                print(f"Embedding failed with key {api_key[:10]}...: {last_error}. Retrying with next key...")
                continue

        if not embedded_chunks:
            raise HTTPException(status_code=500, detail=f"All API keys failed for embedding during PDF upload. Last error: {last_error}")

        records = []
        for i, chunk in enumerate(chunks):
            records.append({
                "user_id": user_id,
                "content": chunk,
                "metadata": {"source_book": file.filename},
                "embedding": embedded_chunks[i]
            })

        for i in range(0, len(records), 100):
            batch = records[i:i+100]
            supabase.table("user_documents").insert(batch).execute()

        return {"status": "success", "message": f"Processed and indexed {len(chunks)} chunks from {file.filename}."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate_flashcards")
def generate_flashcards(request: FlashcardRequest):
    api_keys, _, _ = get_ordered_chat_api_keys()
    last_error = None

    for api_key in api_keys:
        try:
            prompt = f"""You are a medical study assistant. Your goal is to convert the following medical notes into high-yield Anki-style flashcards.
Extract 3 to 5 key facts from the text and create Question/Answer pairs.

Respond strictly with a JSON array of objects, with no markdown formatting around it. Each object must have "question" and "answer" keys.

Text:
{request.text}
"""
            response = invoke_llm_with_fallback(prompt, api_key)
            raw_text = response.content.strip()
            if raw_text.startswith("```json"):
                raw_text = raw_text[7:-3].strip()
            elif raw_text.startswith("```"):
                raw_text = raw_text[3:-3].strip()

            try:
                flashcards = json.loads(raw_text)
                return {"success": True, "flashcards": flashcards}
            except json.JSONDecodeError:
                last_error = "Invalid JSON returned."
                continue

        except Exception as e:
            last_error = str(e)
            continue

    raise HTTPException(status_code=500, detail=f"Failed to generate flashcards. Last error: {last_error}")
