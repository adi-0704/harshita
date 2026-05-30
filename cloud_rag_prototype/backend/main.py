import os
import json
from typing import Optional, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from supabase.client import Client, create_client
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import SupabaseVectorStore

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

class MCQRequest(BaseModel):
    query: str
    context_summary: str = ""

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
            
            # Retrieve documents across all books from Cloud DB
            docs = vectorstore.similarity_search(request.query, k=6)
            
            if not docs:
                return {"summary": "No relevant information found in the database.", "sources": []}
                
            # Optional: Format context with book metadata to help LLM cite sources
            context_parts = []
            sources_list = []
            for doc in docs:
                source = doc.metadata.get('source_book', 'Unknown Book')
                context_parts.append(f"[Source: {source}]\n{doc.page_content}")
                sources_list.append({
                    "content": doc.page_content,
                    "source_book": source
                })
                
            context = "\n\n".join(context_parts)
            
            history_text = ""
            if request.history:
                history_text = "Previous Conversation:\n"
                for msg in request.history:
                    role = msg.get("role", "user")
                    content = msg.get("content", "")
                    history_text += f"{role.capitalize()}: {content}\n"
                history_text += "\n"
            
            llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=api_key)
            
            prompt = f"""You are an expert medical AI assistant designed to generate high-quality, easy-to-study exam notes.
Use the following pieces of retrieved context from medical textbooks to answer the question.

CRITICAL INSTRUCTIONS FOR CHATGPT-STYLE EXAM NOTES:
1. Act like a highly helpful study buddy. Your goal is to generate clean, structured, and highly readable exam notes.
2. Use clear, bold headings to organize the information logically (e.g., **Introduction**, **Causes**, **Symptoms**, **Treatment**).
3. Use concise bullet points for everything. Avoid big, overwhelming walls of text.
4. Bold the most important keywords and high-yield concepts so they are easy to scan and memorize.
5. Keep the language simple and easy to understand, avoiding overly dense academic phrasing while maintaining medical accuracy.
6. If applicable, draw text-based flowcharts using characters (e.g., `├──` and `└──`) for pathogenesis or classifications.
7. Do NOT append source citations or filenames. Keep the notes clean and strictly academic.
8. If the answer is not in the context, state clearly that you don't know based on the provided text.
9. Answer the user's latest Question, keeping in mind the Previous Conversation history if provided.

{history_text}
Context:
{context}

Question: {request.query}"""
            
            response = llm.invoke(prompt)
            
            return {"summary": response.content, "sources": sources_list}
            
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
            
            llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=api_key)
            
            prompt = f"""You are a medical examiner. Generate ONE multiple-choice question (MCQ) based on the following context.
The question should test high-yield concepts. Provide exactly 4 options. 
You MUST return your answer as a raw JSON object with the following exact keys: "question" (string), "options" (array of 4 strings), "correct_index" (integer 0-3), and "explanation" (string).
Do NOT wrap the JSON in markdown code blocks. Just output the raw JSON object.

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
            
            parsed = json.loads(raw_text)
            return parsed
            
        except Exception as e:
            last_error = str(e)
            print(f"API Key failed for MCQ: {last_error}. Retrying with next key...")
            continue
            
    raise HTTPException(status_code=500, detail=f"All API keys exhausted. Last error: {last_error}")
