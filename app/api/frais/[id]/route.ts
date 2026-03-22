import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.frais.delete({ where: { id: Number(params.id) } })
  return NextResponse.json({ ok: true })
}
