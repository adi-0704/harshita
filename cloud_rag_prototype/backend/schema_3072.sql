-- Drop the old table and function
DROP FUNCTION IF EXISTS match_documents(vector(768), float, int);
DROP TABLE IF EXISTS documents;

-- Recreate the table with 3072 dimensions for Google's latest embedding model
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  metadata jsonb,
  -- Upgraded from 768 to 3072 dimensions
  embedding vector(3072)
);

-- Recreate the function to similarity search with 3072 dimensions
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
