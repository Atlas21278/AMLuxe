import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function verifyRequest(req: NextRequest): string | null {
  const secret = req.headers.get('x-internal-secret')
  if (!secret || secret !== process.env.CUSTOMER_API_SECRET) return null
  return req.headers.get('x-clerk-user-id')
}

export async function GET(req: NextRequest) {
  const clerkUserId = verifyRequest(req)
  if (!clerkUserId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const addresses = await prisma.customerAddress.findMany({
    where: { clerkUserId },
    orderBy: [{ defaut: 'desc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json(addresses)
}

export async function POST(req: NextRequest) {
  const clerkUserId = verifyRequest(req)
  if (!clerkUserId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await req.json()
  const { nom, prenom, adresse, ville, codePostal, telephone, defaut } = body

  if (!nom || !prenom || !adresse || !ville || !codePostal || !telephone) {
    return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
  }

  // Si défaut=true, retirer le flag sur les autres adresses
  if (defaut) {
    await prisma.customerAddress.updateMany({
      where: { clerkUserId },
      data: { defaut: false },
    })
  }

  const newAddress = await prisma.customerAddress.create({
    data: {
      clerkUserId,
      nom: String(nom).trim(),
      prenom: String(prenom).trim(),
      adresse: String(adresse).trim(),
      ville: String(ville).trim(),
      codePostal: String(codePostal).trim(),
      telephone: String(telephone).trim(),
      defaut: Boolean(defaut),
    },
  })

  return NextResponse.json(newAddress, { status: 201 })
}
