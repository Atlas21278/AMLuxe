import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-03-25.dahlia',
  })
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Signature manquante' }, { status: 400 })
  }

  const stripe = getStripe()
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

    // Récupérer l'article AVANT la mise à jour (pour marque/modele dans CustomerOrder)
    const article = await prisma.article.findUnique({ where: { id } })

    await prisma.article.update({
      where: { id },
      data: {
        statut: 'Vendu',
        prixVenteReel,
        dateVente: new Date(),
      },
    })

    await logAudit('UPDATE', 'article', id, 'stripe@webhook', { statut: 'Vendu', prixVenteReel, source: 'stripe-webhook' })

    // Créer CustomerOrder si clerkUserId présent dans metadata
    const clerkUserId = session.metadata?.clerkUserId
    if (clerkUserId && article) {
      const prixArticle = session.metadata?.prixArticle
        ? parseFloat(session.metadata.prixArticle)
        : (article.prixVente ?? 0)
      const prixLivraison = session.metadata?.prixLivraison
        ? parseFloat(session.metadata.prixLivraison)
        : 0

      await prisma.customerOrder.create({
        data: {
          clerkUserId,
          articleId: id,
          marque: article.marque,
          modele: article.modele,
          prixArticle,
          prixLivraison,
          stripeSessionId: session.id,
        },
      })
    }
  }

  return NextResponse.json({ received: true })
}
