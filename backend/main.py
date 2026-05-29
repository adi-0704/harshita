import os
import time
import asyncio
from typing import Optional
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import ChatPromptTemplate

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state to track processing status
processing_status = {
    "status": "idle", # idle, processing, completed, error
    "message": "",
    "progress": 0.0 # 0.0 to 100.0
}

VECTOR_STORE_PATH = "faiss_index"

class QueryRequest(BaseModel):
    query: str

def get_api_key():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set")
    return api_key

async def process_pdf_background(file_path: str):
    global processing_status
    processing_status["status"] = "processing"
    processing_status["message"] = "Starting PDF processing..."
    processing_status["progress"] = 0.0
    
    try:
        api_key = get_api_key()
        
        processing_status["message"] = "Loading PDF..."
        loader = PyPDFLoader(file_path)
        docs = loader.load()
        
        processing_status["message"] = f"Loaded {len(docs)} pages. Splitting text..."
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=2000, chunk_overlap=200)
        splits = text_splitter.split_documents(docs)
        
        total_chunks = len(splits)
        processing_status["message"] = f"Created {total_chunks} chunks. Starting embedding generation (this may take a while to respect rate limits)..."
        
        embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-2", google_api_key=api_key)
        
        # Batching and rate limiting for massive files
        batch_size = 10 # Free tier limit is usually ~15 RPM, let's process 10 chunks at a time with a delay
        delay_seconds = 4 # Wait 4 seconds between batches to avoid 429 Too Many Requests
        
        vectorstore = None
        
        for i in range(0, total_chunks, batch_size):
            batch = splits[i:i + batch_size]
            if vectorstore is None:
                 vectorstore = FAISS.from_documents(documents=batch, embedding=embeddings)
            else:
                 # Add documents directly
                 vectorstore.add_documents(documents=batch)
                 
            progress = min(100.0, ((i + len(batch)) / total_chunks) * 100)
            processing_status["progress"] = round(progress, 2)
            processing_status["message"] = f"Embedded {i + len(batch)} / {total_chunks} chunks..."
            
            # Sleep to respect rate limits unless it's the last batch
            if i + batch_size < total_chunks:
                time.sleep(delay_seconds)
                
        # Save vectorstore locally
        processing_status["message"] = "Saving vector database..."
        vectorstore.save_local(VECTOR_STORE_PATH)
        
        processing_status["status"] = "completed"
        processing_status["message"] = "Processing completed successfully!"
        processing_status["progress"] = 100.0
        
    except Exception as e:
        processing_status["status"] = "error"
        processing_status["message"] = str(e)
        print(f"Error processing PDF: {e}")

@app.post("/upload")
async def upload_pdf(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    global processing_status
    if processing_status["status"] == "processing":
        raise HTTPException(status_code=400, detail="A file is already being processed.")
        
    # Save file locally
    file_location = f"temp_{file.filename}"
    with open(file_location, "wb+") as file_object:
        file_object.write(file.file.read())
        
    background_tasks.add_task(process_pdf_background, file_location)
    return {"message": "File uploaded successfully, processing started in background."}

@app.get("/status")
def get_status():
    global processing_status
    return processing_status

@app.post("/query")
def query_agent(request: QueryRequest):
    try:
        api_key = get_api_key()
        
        if not os.path.exists(VECTOR_STORE_PATH):
            raise HTTPException(status_code=400, detail="Vector database not found. Please upload and process a PDF first.")
            
        embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-2", google_api_key=api_key)
        vectorstore = FAISS.load_local(VECTOR_STORE_PATH, embeddings, allow_dangerous_deserialization=True)
        
        # Retrieve documents
        docs = vectorstore.similarity_search(request.query, k=2000)
        context = "\n\n".join([doc.page_content for doc in docs])
        
        llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=api_key)
        
        prompt = f"""You are an intelligent assistant.
Use the following pieces of retrieved context to answer the question or provide a summary.
If the user asks for a summary of a specific chapter or broad topic, provide a comprehensive, detailed, and well-structured summary covering all the retrieved information. Use markdown formatting like bullet points and headings.
If the user asks a specific question, answer it concisely and directly.
If the retrieved context does not contain the answer, say that you don't know based on the provided document.

Context:
{context}

Question: {request.query}"""
        
        response = llm.invoke(prompt)
        
        return {"summary": response.content}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
