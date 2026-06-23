"""
upload_local_chunks.py  (v3 – efficient key rotation)
=======================================================
Strategy:
  - One persistent worker thread per API key
  - Each worker pulls from a shared batch queue
  - Each worker enforces its own per-key RPM pacing (1 req / 4s = 15 RPM max)
  - On 429 / rate-limit: key sleeps 61s then REJOINS the pool (not dropped)
  - On 403 / PERMISSION_DENIED: key is permanently retired
  - Network/transient errors: immediate retry up to 5x with 2s backoff
  - Result: all keys stay active throughout, no wasted 61s global pauses

Usage:
    python upload_local_chunks.py <chunks.json>
"""

import os
import json
import time
import random
import threading
import queue
import requests
from dotenv import load_dotenv
from supabase.client import Client, create_client

load_dotenv()

# ── constants ──────────────────────────────────────────────────────────────────
BATCH_SIZE         = 4      # chunks per embed call (reduced from 14 to avoid TPM limits)
RPM_LIMIT          = 6      # stay safely under the 15 RPM free-tier cap (reduced from 12)
MIN_KEY_INTERVAL   = 60.0 / RPM_LIMIT   # 10s minimum between requests on same key
RATE_COOLDOWN      = 65     # seconds a key sleeps after a 429 before rejoining
NETWORK_RETRIES    = 5      # retries for transient network errors
NETWORK_RETRY_WAIT = 2      # seconds between network retries

# ── helpers ────────────────────────────────────────────────────────────────────

def get_env_vars():
    keys = []
    main_key = os.getenv("GEMINI_API_KEY")
    if main_key:
        keys.append(main_key)
    for i in range(1, 10):
        k = os.getenv(f"EXTRA_API_KEY_{i}")
        if k:
            keys.append(k)
    chat_key = os.getenv("CHAT_GEMINI_API_KEY")
    if chat_key:
        keys.append(chat_key)
    url = os.getenv("SUPABASE_URL")
    svc = os.getenv("SUPABASE_SERVICE_KEY")
    if not all([keys, url, svc]):
        raise ValueError("Missing API keys / SUPABASE_URL / SUPABASE_SERVICE_KEY")
    return keys, url, svc



def embed_batch(api_key: str, texts: list) -> list:
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-embedding-2:batchEmbedContents?key={api_key}"
    )
    payload = {
        "requests": [
            {
                "model":   "models/gemini-embedding-2",
                "content": {"parts": [{"text": t}]},
                "outputDimensionality": 768,
            }
            for t in texts
        ]
    }
    r = requests.post(url, json=payload,
                      headers={"Content-Type": "application/json"}, timeout=30)
    if r.status_code == 200:
        return [e.get("values") for e in r.json().get("embeddings", [])]
    err = r.json().get("error", {}).get("message", r.text)
    raise RuntimeError(f"HTTP_{r.status_code}: {err}")


# ── per-key worker ─────────────────────────────────────────────────────────────

# ── sequential worker ─────────────────────────────────────────────────────────

def sequential_worker(
    api_keys: list,
    supabase_client: Client,
    batch_q: queue.Queue,        # shared work queue
    done_event: threading.Event, # set when all work is done
    progress: dict,              # shared progress dict {lock, done, total}
):
    key_idx = 0
    active_keys = list(api_keys)

    while not done_event.is_set():
        if not active_keys:
            print("ERROR: All API keys have been banned or retired!", flush=True)
            done_event.set()
            break

        # ── pull next batch ────────────────────────────────────────────────────
        try:
            sidx, batch = batch_q.get(timeout=2)
            batch_q.task_done()  # Balance get immediately
        except queue.Empty:
            continue  # queue empty, spin and check done_event

        texts = [doc["content"] for doc in batch]

        # ── try embedding with key rotation on failure ─────────────────────────
        embeddings = None
        attempts_this_batch = 0
        max_batch_attempts = len(active_keys) * 2  # try all keys twice before giving up

        while attempts_this_batch < max_batch_attempts:
            if not active_keys:
                break
            key_idx = key_idx % len(active_keys)
            api_key = active_keys[key_idx]

            try:
                embeddings = embed_batch(api_key, texts)
                break  # success!
            except RuntimeError as e:
                msg = str(e)
                if "HTTP_403" in msg or "PERMISSION_DENIED" in msg or "Permission denied" in msg:
                    print(f"  [Key {key_idx+1}] PERMISSION_DENIED - retiring key permanently.", flush=True)
                    active_keys.pop(key_idx)
                    # Don't increment key_idx since pop shifts the rest
                    continue
                elif "HTTP_429" in msg or "quota" in msg.lower() or "daily" in msg.lower() or "limit: 1000" in msg:
                    print(f"  [Key {key_idx+1}] Rate limit (429) hit - rotating key immediately...", flush=True)
                    key_idx += 1
                    attempts_this_batch += 1
                    time.sleep(1.0)  # brief sleep before trying next key
                    continue
                else:
                    # Other runtime error (network error etc)
                    print(f"  [Key {key_idx+1}] Embedding error: {msg[:100]} - retrying with next key...", flush=True)
                    key_idx += 1
                    attempts_this_batch += 1
                    time.sleep(2.0)
                    continue
            except Exception as e:
                print(f"  [Key {key_idx+1}] Unexpected error: {str(e)[:100]} - rotating key...", flush=True)
                key_idx += 1
                attempts_this_batch += 1
                time.sleep(2.0)
                continue

        # If we failed to embed this batch after all keys, put it back and sleep
        if embeddings is None:
            print("  [WARNING] Failed to embed batch after trying all keys. Re-queuing and sleeping 15s...", flush=True)
            batch_q.put((sidx, batch))
            time.sleep(15.0)
            continue

        # ── build rows ─────────────────────────────────────────────────────────
        if len(embeddings) != len(batch):
            print("  [WARNING] Embedding count mismatch - re-queuing batch.", flush=True)
            batch_q.put((sidx, batch))
            continue

        rows = [
            {
                "content":   doc["content"].replace("\u0000", "").replace("\x00", ""),
                "metadata":  doc["metadata"],
                "embedding": emb,
            }
            for doc, emb in zip(batch, embeddings)
        ]

        # ── insert into Supabase with retries ─────────────────────────────────
        inserted = False
        for attempt in range(1, NETWORK_RETRIES + 1):
            try:
                supabase_client.table("documents").insert(rows).execute()
                inserted = True
                break
            except Exception as e:
                msg = str(e)
                if attempt < NETWORK_RETRIES:
                    print(f"  DB insert error (attempt {attempt}): {msg[:70]} - retrying", flush=True)
                    time.sleep(NETWORK_RETRY_WAIT)
                else:
                    print(f"  DB insert failed after {NETWORK_RETRIES} attempts - re-queuing.", flush=True)
                    batch_q.put((sidx, batch))

        if inserted:
            with progress["lock"]:
                progress["done"] += len(batch)
                pct = min(100.0, progress["done"] / progress["total"] * 100)
                print(f"  Progress: {pct:.1f}% ({progress['done']}/{progress['total']}) [Key {key_idx+1}]", flush=True)
            key_idx += 1
            time.sleep(1.5)  # safe pacing delay between requests


# ── main upload function ───────────────────────────────────────────────────────

def upload_local_chunks(json_file: str):
    print(f"\n{'='*60}")
    print(f"Uploading: {json_file}")
    print("=" * 60)

    if not os.path.exists(json_file):
        print(f"File not found: {json_file}")
        return

    with open(json_file, "r", encoding="utf-8") as f:
        chunks_data = json.load(f)

    total_file_chunks = len(chunks_data)
    print(f"Total chunks in file: {total_file_chunks}")
    if total_file_chunks == 0:
        print("No chunks to upload.")
        return

    api_keys, supabase_url, supabase_key = get_env_vars()
    supabase_client: Client = create_client(supabase_url, supabase_key)

    # ── check already uploaded ─────────────────────────────────────────────────
    source_book = chunks_data[0].get("source_book") if chunks_data else None
    existing_ids: set = set()
    if source_book:
        print(f"Checking DB for existing chunks of '{source_book}'...")
        offset, limit = 0, 1000
        while True:
            try:
                res = (
                    supabase_client.table("documents")
                    .select("metadata")
                    .contains("metadata", {"source_book": source_book})
                    .range(offset, offset + limit - 1)
                    .execute()
                )
                data = res.data
                if not data:
                    break
                for item in data:
                    cid = item.get("metadata", {}).get("chunk_id")
                    if cid is not None:
                        existing_ids.add(cid)
                if len(data) < limit:
                    break
                offset += limit
            except Exception as e:
                print(f"Warning - could not check existing: {e}")
                break
        print(f"Already in DB: {len(existing_ids)} chunks.")

    splits = []
    for chunk in chunks_data:
        if chunk["chunk_id"] in existing_ids:
            continue
        splits.append({
            "content":  chunk["content"].replace("\u0000", "").replace("\x00", ""),
            "metadata": {"source_book": chunk["source_book"], "chunk_id": chunk["chunk_id"]},
        })

    total_chunks = len(splits)
    print(f"Chunks to upload: {total_chunks}")
    if total_chunks == 0:
        print(f"All chunks already uploaded for '{source_book}'. Skipping.")
        return

    # ── build batch queue ──────────────────────────────────────────────────────
    # Shuffle to spread load (avoids all keys hitting same content at once)
    batches = [(i, splits[i:i + BATCH_SIZE]) for i in range(0, total_chunks, BATCH_SIZE)]
    print(f"Total batches: {len(batches)}  |  Keys: {len(api_keys)}  |  RPM/key: {RPM_LIMIT}")
    print(f"Theoretical max throughput: {len(api_keys) * RPM_LIMIT * BATCH_SIZE} chunks/min")

    batch_q: queue.Queue = queue.Queue()
    for item in batches:
        batch_q.put(item)

    done_event = threading.Event()
    progress = {
        "lock":  threading.Lock(),
        "done":  0,
        "total": total_chunks,
    }

    # ── launch single sequential worker thread ─────────────────────────────────
    threads = []
    t = threading.Thread(
        target=sequential_worker,
        args=(api_keys, supabase_client, batch_q, done_event, progress),
        daemon=True,
    )
    threads.append(t)
    t.start()

    # ── wait for all batches to be processed ──────────────────────────────────
    batch_q.join()
    done_event.set()    # signal worker to exit
    t.join(timeout=5)

    print(f"\n[DONE] All chunks from '{json_file}' uploaded successfully!")


# ── CLI ────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("json_file", help="Path to chunk JSON file")
    args = parser.parse_args()
    upload_local_chunks(args.json_file)
