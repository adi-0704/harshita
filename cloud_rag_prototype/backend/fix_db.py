import psycopg2

conn = psycopg2.connect("postgresql://postgres.madfdwulvoxvrcgerthm:5jrNKJfjmbu37R5f@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres")
cur = conn.cursor()

# Drop old function and table
cur.execute("DROP FUNCTION IF EXISTS match_documents(vector(768), float, int);")
cur.execute("DROP TABLE IF EXISTS documents;")

# Recreate with 3072 dimensions
cur.execute("""
create table documents (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  metadata jsonb,
  embedding vector(3072)
);
""")

cur.execute("""
create or replace function match_documents (
  query_embedding vector(3072),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where 1 - (documents.embedding <=> query_embedding) > match_threshold
  order by documents.embedding <=> query_embedding
  limit match_count;
$$;
""")

conn.commit()
cur.close()
conn.close()
print("Database schema successfully upgraded to 3072 dimensions!")
