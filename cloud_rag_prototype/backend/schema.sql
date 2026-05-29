-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Create a table to store your medical documents
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  metadata jsonb,
  -- We are using Google's text-embedding-004 model, which produces vectors with 768 dimensions
  embedding vector(768)
);

-- Create a function to similarity search for documents
create or replace function match_documents (
  query_embedding vector(768),
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
