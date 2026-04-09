import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
})

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Signature manquante' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook Stripe invalide:', err)
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    const articleId = session.metadata?.articleId
    if (!articleId) {
      console.error('Webhook Stripe : articleId manquant dans metadata')
      return NextResponse.json({ error: 'articleId manquant' }, { status: 400 })
    }

    const id = parseInt(articleId)
    const prixVenteReel = session.amount_total ? session.amount_total / 100 : null

    await prisma.article.update({
      where: { id },
      data: {
        statut: 'Vendu',
        prixVenteReel,
        dateVente: new Date(),
      },
    })

    await logAudit({
      action: 'UPDATE',
      ressource: 'article',
      cible: id,
      details: JSON.stringify({ statut: 'Vendu', prixVenteReel, source: 'stripe-webhook' }),
      userEmail: 'stripe@webhook',
    })
  }

  return NextResponse.json({ received: true })
}
