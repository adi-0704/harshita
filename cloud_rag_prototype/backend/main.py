import os
import json
import random
import io
import re
from typing import Optional, List
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from supabase.client import Client, create_client
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import SupabaseVectorStore
from langchain_text_splitters import RecursiveCharacterTextSplitter

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    query: str
    history: Optional[list] = []
    user_id: Optional[str] = None

class MCQRequest(BaseModel):
    query: str
    context_summary: str = ""

class FlashcardRequest(BaseModel):
    text: str

def get_env_vars():
    api_keys = [os.getenv("GEMINI_API_KEY")]
    for i in range(1, 10):
        key = os.getenv(f"EXTRA_API_KEY_{i}")
        if key:
            api_keys.append(key)
            
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
    
    if not all([api_keys[0], supabase_url, supabase_key]):
        raise ValueError("Missing API Keys. Please check .env")
        
    return api_keys, supabase_url, supabase_key

import random

@app.post("/query")
def query_knowledge_base(request: QueryRequest):
    api_keys, supabase_url, supabase_key = get_env_vars()
    
    # Use dedicated chat API key if provided to avoid ingestion limits
    chat_key = os.getenv("CHAT_GEMINI_API_KEY")
    if chat_key:
        api_keys = [chat_key]
    else:
        random.shuffle(api_keys)
    
    last_error = None
    
    for api_key in api_keys:
        try:
            supabase: Client = create_client(supabase_url, supabase_key)
            embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001", google_api_key=api_key)
            
            # Embed the query once
            query_embedding = embeddings.embed_query(request.query)
            
            # Retrieve from global documents
            response_global = supabase.rpc("match_documents", {"query_embedding": query_embedding, "match_count": 6}).execute()
            docs_global = response_global.data if response_global.data else []
            
            # Retrieve from user documents if user_id is provided
            docs_user = []
            if request.user_id:
                response_user = supabase.rpc("match_user_documents", {
                    "query_embedding": query_embedding, 
                    "match_count": 4, 
                    "p_user_id": request.user_id
                }).execute()
                docs_user = response_user.data if response_user.data else []
                
            all_docs = docs_global + docs_user
            
            # Format context
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
            
            llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=api_key)
            
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
            
            response = llm.invoke(prompt)
            raw_content = response.content
            
            # Parse out suggestions
            suggestions = []
            main_content = raw_content
            if "---SUGGESTIONS---" in raw_content:
                parts = raw_content.split("---SUGGESTIONS---")
                main_content = parts[0].strip()
                sug_text = parts[1].strip()
                # extract lines starting with numbers
                for line in sug_text.split('\n'):
                    line = line.strip()
                    if re.match(r'^\d+\.', line):
                        suggestions.append(re.sub(r'^\d+\.\s*', '', line))
            
            return {"summary": main_content, "sources": sources_list, "suggestions": suggestions[:3]}
            
        except Exception as e:
            last_error = str(e)
            print(f"API Key failed: {last_error}. Retrying with next key...")
            continue
            
    # If all keys failed
    raise HTTPException(status_code=500, detail=f"All API keys exhausted. Last error: {last_error}")

@app.post("/generate_mcq")
def generate_mcq(request: MCQRequest):
    api_keys, supabase_url, supabase_key = get_env_vars()
    random.shuffle(api_keys)
    
    last_error = None
    
    for api_key in api_keys:
        try:
            supabase: Client = create_client(supabase_url, supabase_key)
            embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001", google_api_key=api_key)
            
            vectorstore = SupabaseVectorStore(
                client=supabase,
                embedding=embeddings,
                table_name="documents",
                query_name="match_documents"
            )
            
            docs = vectorstore.similarity_search(request.query, k=10)
            
            context_parts = []
            for doc in docs:
                context_parts.append(doc.page_content)
                
            context = "\n\n".join(context_parts)
            
            llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=api_key)
            
            prompt = f"""You are a medical examiner. Generate exactly 5 multiple-choice questions (MCQs) based strictly on the following context.
The questions should test high-yield concepts from the provided topic. Provide exactly 4 options for each question. 
You MUST return your answer as a raw JSON array of 5 objects. Each object must have the following exact keys: "question" (string), "options" (array of 4 strings), "correct_index" (integer 0-3), and "explanation" (string).
Do NOT wrap the JSON in markdown code blocks. Just output the raw JSON array.

Topic: {request.query}
Additional context summary: {request.context_summary}

Context:
{context}"""
            
            response = llm.invoke(prompt)
            
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
                # Ensure it's a list
                if isinstance(questions, dict) and "questions" in questions:
                    return {"success": True, "questions": questions["questions"]}
                return {"success": True, "questions": questions}
            except json.JSONDecodeError:
                print(f"Failed to parse JSON on key {api_key}")
                last_error = "LLM did not return valid JSON."
                continue
                
        except Exception as e:
            last_error = str(e)
            print(f"API Key failed: {last_error}. Retrying with next key...")
            continue
            
    raise HTTPException(status_code=500, detail=f"Failed to generate MCQ. Last error: {last_error}")

import pypdf

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
        
        api_keys, supabase_url, supabase_key = get_env_vars()
        api_key = random.choice(api_keys)
        supabase: Client = create_client(supabase_url, supabase_key)
        embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001", google_api_key=api_key)
        
        embedded_chunks = embeddings.embed_documents(chunks)
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
    api_keys, supabase_url, supabase_key = get_env_vars()
    random.shuffle(api_keys)
    last_error = None
    
    for api_key in api_keys:
        try:
            llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=api_key)
            prompt = f"""You are a medical study assistant. Your goal is to convert the following medical notes into high-yield Anki-style flashcards.
Extract 3 to 5 key facts from the text and create Question/Answer pairs.

Respond strictly with a JSON array of objects, with no markdown formatting around it. Each object must have "question" and "answer" keys.

Text:
{request.text}
"""
            response = llm.invoke(prompt)
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
