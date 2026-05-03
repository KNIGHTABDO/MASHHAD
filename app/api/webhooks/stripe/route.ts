import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { clerkClient } from '@clerk/nextjs/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiVersion: '2025-02-24.acacia' as any,
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: Request) {
  const body = await req.text()
  const sig = (await headers()).get('stripe-signature') as string

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: unknown) {
    const error = err as Error
    console.error(`[Stripe Webhook] Error: ${error.message}`)
    return NextResponse.json({ error: 'Webhook Error' }, { status: 400 })
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.client_reference_id

    if (userId) {
      console.log(`[Stripe Webhook] Activating Pro for user: ${userId}`)
      
      const clerk = await clerkClient()
      
      try {
        await clerk.users.updateUserMetadata(userId, {
          publicMetadata: {
            plan: 'lifetime',
            isPro: true
          }
        })
        console.log(`[Stripe Webhook] Successfully activated Pro for ${userId}`)
      } catch (clerkErr: unknown) {
        console.error(`[Stripe Webhook] Failed to update Clerk metadata:`, clerkErr)
        return NextResponse.json({ error: 'Clerk Error' }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ received: true })
}
