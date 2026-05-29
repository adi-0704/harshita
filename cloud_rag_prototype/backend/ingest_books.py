import os
import argparse
import time
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from supabase.client import Client, create_client
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import SupabaseVectorStore

load_dotenv()

def get_env_vars():
    api_key = os.getenv("GEMINI_API_KEY")
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
    
    if not all([api_key, supabase_url, supabase_key]):
        raise ValueError("Missing GEMINI_API_KEY, SUPABASE_URL, or SUPABASE_SERVICE_KEY in .env")
        
    return api_key, supabase_url, supabase_key

def ingest_pdf(pdf_path: str):
    print(f"Starting ingestion for: {pdf_path}")
    print("Loading PDF...")
    loader = PyPDFLoader(pdf_path)
    docs = loader.load()
    
    # Add metadata to identify source book
    book_name = os.path.basename(pdf_path)
    for doc in docs:
        doc.metadata["source_book"] = book_name
        
    print(f"Loaded {len(docs)} pages. Splitting text...")
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=2000, chunk_overlap=200)
    splits = text_splitter.split_documents(docs)
    
    total_chunks = len(splits)
    
    api_key, supabase_url, supabase_key = get_env_vars()
    
    print(f"Created {total_chunks} chunks. Connecting to Supabase Cloud Database...")
    
    supabase: Client = create_client(supabase_url, supabase_key)
    embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001", google_api_key=api_key)
    
    # Connect to Supabase Vector Store
    vectorstore = SupabaseVectorStore(
        client=supabase,
        embedding=embeddings,
        table_name="documents",
        query_name="match_documents"
    )
    
    batch_size = 50
    delay_seconds = 2
    
    print(f"Pushing chunks to Database (Batch size: {batch_size}, Delay: {delay_seconds}s)")
    
    for i in range(0, total_chunks, batch_size):
        batch = splits[i:i + batch_size]
        vectorstore.add_documents(documents=batch)
        
        progress = min(100.0, ((i + len(batch)) / total_chunks) * 100)
        print(f"Progress: {progress:.2f}% ({i + len(batch)} / {total_chunks} chunks)")
        
        if i + batch_size < total_chunks:
            time.sleep(delay_seconds)
            
    print(f"Successfully ingested {book_name} into the Knowledge Base!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest a PDF into the Knowledge Base.")
    parser.add_argument("pdf_path", type=str, help="Path to the PDF file")
    args = parser.parse_args()
    
    ingest_pdf(args.pdf_path)
