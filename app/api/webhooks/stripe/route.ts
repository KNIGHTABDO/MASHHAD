import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { clerkClient } from '@clerk/nextjs/server'

export async function POST(req: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripeSecretKey || !webhookSecret) {
    return NextResponse.json({ error: 'Missing Stripe configuration' }, { status: 500 })
  }

  const stripe = new Stripe(stripeSecretKey)
  const body = await req.text()
  const sig = (await headers()).get('stripe-signature') as string

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: unknown) {
    const error = err as Error
    console.error(`[Stripe Webhook] Signature Verification Failed: ${error.message}`)
    return NextResponse.json({ error: `Webhook Error: ${error.message}` }, { status: 400 })
  }

  console.log(`[Stripe Webhook] Received event: ${event.type}`)

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.client_reference_id

    if (!userId) {
      console.error(`[Stripe Webhook] CRITICAL: No client_reference_id found in session. Cannot upgrade user.`)
      return NextResponse.json({ error: 'No User ID in session' }, { status: 400 })
    }

    try {
      const clerk = await clerkClient()
      console.log(`[Stripe Webhook] Updating Clerk metadata for user: ${userId}`)
      
      await clerk.users.updateUserMetadata(userId, {
        publicMetadata: {
          plan: 'lifetime',
          isPro: true
        }
      })
      
      console.log(`[Stripe Webhook] SUCCESS: Pro activated for ${userId}`)
    } catch (clerkErr: unknown) {
      const error = clerkErr as Error
      console.error(`[Stripe Webhook] Clerk Update Failed:`, error.message)
      return NextResponse.json({ error: `Clerk Error: ${error.message}` }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
