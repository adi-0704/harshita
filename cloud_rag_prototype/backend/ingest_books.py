import os
import argparse
import time
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from supabase.client import Client, create_client
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import SupabaseVectorStore
import concurrent.futures

load_dotenv()

def get_env_vars():
    api_keys = [os.getenv("GEMINI_API_KEY")]
    for i in range(1, 10):
        key = os.getenv(f"EXTRA_API_KEY_{i}")
        if key:
            api_keys.append(key)
            
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
    
    if not all([api_keys[0], supabase_url, supabase_key]):
        raise ValueError("Missing GEMINI_API_KEY, SUPABASE_URL, or SUPABASE_SERVICE_KEY in .env")
        
    return api_keys, supabase_url, supabase_key

def process_batch(vectorstore, batch, start_idx, total_chunks, key_idx):
    try:
        vectorstore.add_documents(documents=batch)
        progress = min(100.0, ((start_idx + len(batch)) / total_chunks) * 100)
        print(f"Progress: {progress:.2f}% ({start_idx + len(batch)} / {total_chunks} chunks) [Key {key_idx+1}]")
        return True
    except Exception as e:
        print(f"Key {key_idx+1} failed with error: {str(e)[:100]}... Batch queued for retry.")
        return False

def ingest_pdf(pdf_path: str, start_chunk: int = 0):
    print(f"Starting async threaded ingestion for: {pdf_path}")
    print("Loading PDF...")
    loader = PyPDFLoader(pdf_path)
    docs = loader.load()
    
    book_name = os.path.basename(pdf_path)
    for doc in docs:
        doc.metadata["source_book"] = book_name
        
    print(f"Loaded {len(docs)} pages. Splitting text...")
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=2000, chunk_overlap=200)
    splits = text_splitter.split_documents(docs)
    
    total_chunks = len(splits)
    
    api_keys, supabase_url, supabase_key = get_env_vars()
    
    print(f"Created {total_chunks} chunks. Connecting to Supabase Cloud Database...")
    
    supabase: Client = create_client(supabase_url, supabase_key)
    
    vectorstores = []
    for key in api_keys:
        embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001", google_api_key=key)
        vectorstore = SupabaseVectorStore(
            client=supabase,
            embedding=embeddings,
            table_name="documents",
            query_name="match_documents"
        )
        vectorstores.append(vectorstore)
        
    batch_size = 14
    delay_seconds = 61
    num_keys = len(vectorstores)
    
    print(f"Pushing chunks (Batch size: {batch_size}, Speed: {num_keys}x Threads Concurrently, Delay: {delay_seconds}s)")
    
    batch_queue = []
    for idx in range(start_chunk, total_chunks, batch_size):
        batch_queue.append((idx, splits[idx:idx + batch_size]))
        
    while batch_queue:
        batches_to_dispatch = []
        for _ in range(min(num_keys, len(batch_queue))):
            batches_to_dispatch.append(batch_queue.pop(0))
            
        with concurrent.futures.ThreadPoolExecutor(max_workers=num_keys) as executor:
            future_to_batch = {}
            # Assign each batch to a different vectorstore (key)
            for j, (start_idx, batch) in enumerate(batches_to_dispatch):
                vectorstore = vectorstores[j % num_keys]
                future = executor.submit(process_batch, vectorstore, batch, start_idx, total_chunks, j)
                future_to_batch[future] = (start_idx, batch)
                
            # Wait for all to finish
            for future in concurrent.futures.as_completed(future_to_batch):
                start_idx, batch = future_to_batch[future]
                success = future.result()
                if not success:
                    # If it failed, put it back at the front of the queue to retry next round
                    batch_queue.insert(0, (start_idx, batch))
                    
        # Sleep to respect rate limits if there are more batches left
        if batch_queue:
            time.sleep(delay_seconds)
            
    print(f"Successfully ingested {book_name} into the Knowledge Base!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest a PDF into the Knowledge Base.")
    parser.add_argument("pdf_path", type=str, help="Path to the PDF file")
    parser.add_argument("--start-chunk", type=int, default=0, help="Chunk index to start from")
    args = parser.parse_args()
    
    ingest_pdf(args.pdf_path, args.start_chunk)
