import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTrackingInfo } from '@/lib/tracking'

export async function GET(req: NextRequest, { params }: { params: { numero: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { numero } = params
  if (!numero) return NextResponse.json({ error: 'Numéro manquant' }, { status: 400 })

  const result = await getTrackingInfo(numero)
  return NextResponse.json(result)
}
