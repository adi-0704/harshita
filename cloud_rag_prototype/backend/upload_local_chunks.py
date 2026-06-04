import os
import json
import time
import concurrent.futures
from dotenv import load_dotenv
from langchain_core.documents import Document
from supabase.client import Client, create_client
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import SupabaseVectorStore

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
        raise ValueError("Missing env vars")
    return api_keys, supabase_url, supabase_key

def process_batch(vectorstore, batch, start_idx, total_chunks, key_idx):
    try:
        vectorstore.add_documents(documents=batch)
        progress = min(100.0, ((start_idx + len(batch)) / total_chunks) * 100)
        print(f"Progress: {progress:.1f}% ({start_idx + len(batch)}/{total_chunks} chunks) [Key {key_idx+1}]", flush=True)
        return True
    except Exception as e:
        print(f"Key {key_idx+1} failed: {str(e)[:120]}", flush=True)
        return False

def upload_local_chunks(json_file: str):
    print(f"\n{'='*60}")
    print(f"Uploading local chunks from: {json_file}")
    print('='*60)
    
    if not os.path.exists(json_file):
        print(f"File {json_file} not found. Run extract_local_ocr.py first!")
        return

    with open(json_file, "r", encoding="utf-8") as f:
        chunks_data = json.load(f)

    # Convert JSON chunks to Langchain Documents
    splits = []
    for chunk in chunks_data:
        doc = Document(
            page_content=chunk["content"],
            metadata={"source_book": chunk["source_book"], "chunk_id": chunk["chunk_id"]}
        )
        splits.append(doc)
    
    total_chunks = len(splits)
    print(f"Total chunks to upload: {total_chunks}")
    
    if total_chunks == 0:
        print("No chunks found in file.")
        return
    
    api_keys, supabase_url, supabase_key = get_env_vars()
    supabase_client: Client = create_client(supabase_url, supabase_key)
    
    vectorstores = []
    for key in api_keys:
        # We need the API to generate embeddings (vectors)
        embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001", google_api_key=key, output_dimensionality=768)
        vs = SupabaseVectorStore(
            client=supabase_client,
            embedding=embeddings,
            table_name="documents",
            query_name="match_documents"
        )
        vectorstores.append(vs)
    
    num_keys = len(vectorstores)
    batch_size = 14
    delay_seconds = 61
    
    print(f"Using {num_keys} API keys in parallel to embed and upload. Batch size: {batch_size}")
    
    batch_queue = []
    for idx in range(0, total_chunks, batch_size):
        batch_queue.append((idx, splits[idx:idx + batch_size]))
    
    round_num = 0
    while batch_queue:
        round_num += 1
        batches = []
        for _ in range(min(num_keys, len(batch_queue))):
            batches.append(batch_queue.pop(0))
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=num_keys) as executor:
            futures = {}
            for j, (sidx, batch) in enumerate(batches):
                vs = vectorstores[j % num_keys]
                f = executor.submit(process_batch, vs, batch, sidx, total_chunks, j)
                futures[f] = (sidx, batch)
            
            for f in concurrent.futures.as_completed(futures):
                sidx, batch = futures[f]
                if not f.result():
                    batch_queue.insert(0, (sidx, batch))
        
        if batch_queue:
            print(f"Waiting {delay_seconds}s for rate limit... ({len(batch_queue)} batches left)", flush=True)
            time.sleep(delay_seconds)
    
    print(f"\n[DONE] Successfully uploaded all chunks from {json_file} to Supabase!")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("json_file", help="Path to the JSON file with chunks")
    args = parser.parse_args()
    
    upload_local_chunks(args.json_file)
