import os
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_DIR = "./chroma_db"

class QueryRequest(BaseModel):
    query: str

def get_api_key():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set")
    return api_key

@app.post("/query")
def query_knowledge_base(request: QueryRequest):
    try:
        api_key = get_api_key()
        
        if not os.path.exists(DB_DIR):
            raise HTTPException(status_code=400, detail="Database is empty. Please run the ingestion script first.")
            
        embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        vectorstore = Chroma(persist_directory=DB_DIR, embedding_function=embeddings)
        
        # Retrieve documents across all books
        docs = vectorstore.similarity_search(request.query, k=2000)
        
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
        raise HTTPException(status_code=500, detail=str(e))
