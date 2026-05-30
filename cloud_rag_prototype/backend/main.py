import os
from typing import Optional
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

@app.post("/query")
def query_knowledge_base(request: QueryRequest):
    api_keys, supabase_url, supabase_key = get_env_vars()
    
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
            docs = vectorstore.similarity_search(request.query, k=15)
            
            if not docs:
                return {"summary": "No relevant information found in the database."}
                
            # Optional: Format context with book metadata to help LLM cite sources
            context_parts = []
            for doc in docs:
                source = doc.metadata.get('source_book', 'Unknown Book')
                context_parts.append(f"[Source: {source}]\n{doc.page_content}")
                
            context = "\n\n".join(context_parts)
            
            llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=api_key)
            
            prompt = f"""You are an intelligent knowledge base assistant for an MBBS medical student preparing for exams.
Use the following pieces of retrieved context from multiple medical textbooks to answer the question or provide a summary.

CRITICAL INSTRUCTIONS FOR EXAM-ORIENTED FORMAT:
1. Act as a strict MBBS Examiner. Your answer must be highly detailed, comprehensive, and structured exactly how a top student would write a university exam answer.
2. Always use standard medical headings (e.g., Definition, Etiology, Pathogenesis, Clinical Features, Investigations, Management, Complications).
3. Be highly concise but information-dense. Use short bullet points exclusively. No long paragraphs.
4. Emphasize "High-Yield" exam points. Include mnemonics if applicable, and highlight critical keywords and values using **bold** text.
5. If applicable, draw text-based flowcharts using characters (e.g., `├──` and `└──`) for pathogenesis or classifications.
6. Do NOT append source citations or filenames. Keep the notes clean and strictly academic.
7. If the answer is not in the context, state clearly that you don't know based on the provided text.

Context:
{context}

Question: {request.query}"""
            
            response = llm.invoke(prompt)
            
            return {"summary": response.content}
            
        except Exception as e:
            last_error = str(e)
            print(f"API Key failed: {last_error}. Retrying with next key...")
            continue
            
    # If all keys failed
    raise HTTPException(status_code=500, detail=f"All API keys exhausted. Last error: {last_error}")
