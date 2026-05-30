-- Create the chat_history table
CREATE TABLE public.chat_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'ai')),
    content TEXT NOT NULL,
    sources JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows users to insert their own chats
CREATE POLICY "Users can insert their own chat history"
    ON public.chat_history
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create a policy that allows users to select their own chats
CREATE POLICY "Users can view their own chat history"
    ON public.chat_history
    FOR SELECT
    USING (auth.uid() = user_id);

-- Create a policy that allows users to delete their own chats
CREATE POLICY "Users can delete their own chat history"
    ON public.chat_history
    FOR DELETE
    USING (auth.uid() = user_id);
