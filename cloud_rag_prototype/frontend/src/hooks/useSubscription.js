import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabaseClient'

const API_BASE = 'https://medical-ai-backend.vercel.app';

export function useSubscription(session) {
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchSubscription = useCallback(async () => {
    if (!session?.user?.id) {
      setSubscription(null)
      return
    }
    try {
      const res = await fetch(`${API_BASE}/user/subscription?user_id=${session.user.id}`)
      if (res.ok) {
        const data = await res.json()
        setSubscription(data)
      }
    } catch (e) {
      console.error('Subscription fetch error:', e)
    }
  }, [session?.user?.id])

  useEffect(() => {
    fetchSubscription()
  }, [fetchSubscription])

  const isLifetimeFree = subscription?.is_lifetime_free || false
  const plan = subscription?.plan || 'free'
  const status = subscription?.status || 'trialing'
  const usage = subscription?.usage || {}
  const limits = subscription?.limits || {}

  const canUseAction = useCallback((action) => {
    if (isLifetimeFree) return { allowed: true, remaining: 999999, reason: 'Lifetime free' }
    if (plan === 'pro' || plan === 'elite') return { allowed: true, remaining: 999999, reason: 'Pro/Elite plan' }
    
    const used = usage[action] || 0
    const limit = limits[action === 'query' ? 'query_daily' : action === 'pdf_upload' ? 'pdf_total' : action === 'mcq' ? 'mcq_daily' : 'flashcard_daily'] || 0
    
    if (used >= limit) {
      return { 
        allowed: false, 
        remaining: 0, 
        reason: `Daily limit reached (${used}/${limit}). Upgrade to Pro for unlimited access.` 
      }
    }
    return { allowed: true, remaining: limit - used, reason: '' }
  }, [isLifetimeFree, plan, usage, limits])

  const initRazorpayCheckout = useCallback(async (planType, amountPaise) => {
    if (!session?.user?.id) return false
    try {
      const res = await fetch(`${API_BASE}/razorpay/create_order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: session.user.id, plan: planType, amount_paise: amountPaise })
      })
      const data = await res.json()
      if (!data.success || !data.order_id) return false

      const rzp = new window.Razorpay({
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        name: 'MedAI RAG',
        description: `${planType === 'pro' ? 'Pro' : 'Elite'} Plan Subscription`,
        order_id: data.order_id,
        handler: function () {
          fetchSubscription()
        },
        prefill: {
          email: session.user.email,
        },
        theme: { color: '#3b82f6' }
      })
      rzp.open()
      return true
    } catch (e) {
      console.error('Razorpay checkout error:', e)
      return false
    }
  }, [session?.user?.id, session?.user?.email, fetchSubscription])

  const refresh = fetchSubscription

  return {
    subscription,
    loading,
    isLifetimeFree,
    plan,
    status,
    usage,
    limits,
    canUseAction,
    initRazorpayCheckout,
    refresh,
  }
}
