import os
from dotenv import load_dotenv
from supabase.client import create_client

load_dotenv()
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_KEY'))

print("Fetching all documents from the database...")
all_docs = []
offset = 0

# Supabase limits fetches to 1000 rows by default, so we loop to get them all
while True:
    res = supabase.table('documents').select('id', 'content').range(offset, offset + 999).execute()
    data = res.data
    all_docs.extend(data)
    if len(data) < 1000:
        break
    offset += 1000

print(f"Total rows fetched: {len(all_docs)}")

seen_content = set()
duplicate_ids = []

for doc in all_docs:
    content = doc['content']
    # If we've already seen this exact text chunk, it's a duplicate
    if content in seen_content:
        duplicate_ids.append(doc['id'])
    else:
        seen_content.add(content)

print(f"Found {len(duplicate_ids)} duplicate rows!")

if duplicate_ids:
    print("Deleting duplicates in batches...")
    batch_size = 100
    for i in range(0, len(duplicate_ids), batch_size):
        batch = duplicate_ids[i:i+batch_size]
        supabase.table('documents').delete().in_('id', batch).execute()
        print(f"Deleted batch {i // batch_size + 1}")

print("Done! Database is perfectly clean.")
