-- Drop the old function
DROP FUNCTION IF EXISTS match_documents(vector(3072), float, int);
DROP FUNCTION IF EXISTS match_documents(vector(768), float, int);

-- Recreate the function to perfectly match Langchain's expected signature
create or replace function match_documents (
  query_embedding vector(3072),
  match_count int DEFAULT null,
  filter jsonb DEFAULT '{}'
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
  -- We don't apply a strict match_threshold here to ensure it always returns results
  order by documents.embedding <=> query_embedding
  limit match_count;
$$;
