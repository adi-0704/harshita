import os
import argparse
import time
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

load_dotenv()

DB_DIR = "./chroma_db"

def get_api_key():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set")
    return api_key

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
    print(f"Created {total_chunks} chunks. Connecting to Chroma Database...")
    
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    
    # Initialize/connect to persistent ChromaDB
    vectorstore = Chroma(persist_directory=DB_DIR, embedding_function=embeddings)
    
    batch_size = 10
    delay_seconds = 4
    
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
