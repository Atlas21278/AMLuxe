'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

export async function getCommandes() {
  return prisma.commande.findMany({
    include: {
      articles: true,
      frais: true,
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getCommande(id: number) {
  return prisma.commande.findUnique({
    where: { id },
    include: {
      articles: true,
      frais: true,
    },
  })
}

export async function creerCommande(data: {
  fournisseur: string
  date: string
  statut: string
  tracking?: string
  notes?: string
}) {
  await prisma.commande.create({
    data: {
      fournisseur: data.fournisseur,
      date: new Date(data.date),
      statut: data.statut,
      tracking: data.tracking || null,
      notes: data.notes || null,
    },
  })
  revalidatePath('/commandes')
}

export async function modifierStatutCommande(id: number, statut: string) {
  await prisma.commande.update({
    where: { id },
    data: { statut },
  })
  revalidatePath('/commandes')
}

export async function supprimerCommande(id: number) {
  await prisma.commande.delete({ where: { id } })
  revalidatePath('/commandes')
}

export async function modifierCommande(
  id: number,
  data: {
    fournisseur: string
    date: string
    statut: string
    tracking?: string
    notes?: string
  }
) {
  await prisma.commande.update({
    where: { id },
    data: {
      fournisseur: data.fournisseur,
      date: new Date(data.date),
      statut: data.statut,
      tracking: data.tracking || null,
      notes: data.notes || null,
    },
  })
  revalidatePath('/commandes')
}
