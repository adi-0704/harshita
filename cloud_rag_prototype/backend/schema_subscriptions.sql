-- Subscription & Billing Schema for MedAI RAG
-- Run this in the Supabase SQL Editor

-- ============================================
-- LIFETIME FREE USERS (for special access)
-- ============================================
CREATE TABLE IF NOT EXISTS public.lifetime_free_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.lifetime_free_users ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'lifetime_free_users'
          AND policyname = 'Service role can manage lifetime free users'
    ) THEN
        CREATE POLICY "Service role can manage lifetime free users"
            ON public.lifetime_free_users
            FOR ALL
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lifetime_free_users TO authenticated;
GRANT SELECT ON public.lifetime_free_users TO anon;

-- ============================================
-- SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan TEXT NOT NULL CHECK (plan IN ('free', 'pro', 'elite')),
    status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing')),
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    current_period_start TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE,
    razorpay_subscription_id TEXT,
    razorpay_order_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON public.subscriptions (user_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON public.subscriptions (status);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'subscriptions'
          AND policyname = 'Users can view own subscription'
    ) THEN
        CREATE POLICY "Users can view own subscription"
            ON public.subscriptions
            FOR SELECT
            USING (auth.uid() = user_id);
    END IF;
END $$;

GRANT SELECT ON public.subscriptions TO authenticated;

-- ============================================
-- USAGE LOGS (for quota enforcement)
-- ============================================
CREATE TABLE IF NOT EXISTS public.usage_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('query', 'mcq', 'flashcard', 'pdf_upload')),
    count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS usage_logs_user_action_date_idx 
    ON public.usage_logs (user_id, action, created_at DESC);

ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'usage_logs'
          AND policyname = 'Users can insert own usage logs'
    ) THEN
        CREATE POLICY "Users can insert own usage logs"
            ON public.usage_logs
            FOR INSERT
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'usage_logs'
          AND policyname = 'Users can view own usage logs'
    ) THEN
        CREATE POLICY "Users can view own usage logs"
            ON public.usage_logs
            FOR SELECT
            USING (auth.uid() = user_id);
    END IF;
END $$;

GRANT SELECT, INSERT ON public.usage_logs TO authenticated;

-- ============================================
-- FUNCTION: Get user subscription status
-- ============================================
CREATE OR REPLACE FUNCTION public.get_user_subscription(p_user_id UUID)
RETURNS TABLE (
    plan TEXT,
    status TEXT,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    is_lifetime_free BOOLEAN
)
LANGUAGE sql STABLE
SECURITY DEFINER
AS $$
    SELECT 
        COALESCE(s.plan, 'free') AS plan,
        COALESCE(s.status, 'trialing') AS status,
        s.trial_ends_at,
        s.current_period_end,
        EXISTS (
            SELECT 1 FROM public.lifetime_free_users lfu 
            WHERE lfu.user_id = p_user_id
        ) AS is_lifetime_free
    FROM auth.users u
    LEFT JOIN public.subscriptions s ON s.user_id = u.id
    WHERE u.id = p_user_id
    ORDER BY s.created_at DESC
    LIMIT 1;
$$;

-- ============================================
-- FUNCTION: Get today's usage for a user
-- ============================================
CREATE OR REPLACE FUNCTION public.get_user_daily_usage(p_user_id UUID, p_action TEXT)
RETURNS INTEGER
LANGUAGE sql STABLE
SECURITY DEFINER
AS $$
    SELECT COALESCE(SUM(count), 0)::INTEGER
    FROM public.usage_logs
    WHERE user_id = p_user_id
      AND action = p_action
      AND created_at >= DATE_TRUNC('day', NOW());
$$;

-- ============================================
-- FUNCTION: Get monthly usage for a user
-- ============================================
CREATE OR REPLACE FUNCTION public.get_user_monthly_usage(p_user_id UUID, p_action TEXT)
RETURNS INTEGER
LANGUAGE sql STABLE
SECURITY DEFINER
AS $$
    SELECT COALESCE(SUM(count), 0)::INTEGER
    FROM public.usage_logs
    WHERE user_id = p_user_id
      AND action = p_action
      AND created_at >= DATE_TRUNC('month', NOW());
$$;
