import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface ArticleImport {
  marque: string
  modele: string
  prixAchat: number
  etat: string
  refFournisseur?: string
  statut?: string
  prixVente?: number
  plateforme?: string
  prixVenteReel?: number
  fraisVente?: number
  dateVente?: string
}

interface FraisImport {
  type: string
  montant: number
  description?: string
}

interface CommandeImport {
  fournisseur: string
  date: string
  statut: string
  tracking?: string
  notes?: string
  articles: ArticleImport[]
  frais: FraisImport[]
}

const MAX_COMMANDES = 500

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  // Admins seulement
  if (session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Accès refusé — réservé aux admins' }, { status: 403 })
  }

  const body: { commandes: CommandeImport[] } = await req.json()

  if (!Array.isArray(body.commandes) || body.commandes.length === 0) {
    return NextResponse.json({ error: 'Aucune commande à importer' }, { status: 400 })
  }

  if (body.commandes.length > MAX_COMMANDES) {
    return NextResponse.json({ error: `Import limité à ${MAX_COMMANDES} commandes par appel` }, { status: 400 })
  }

  let nbCommandes = 0
  let nbArticles = 0
  let nbFrais = 0
  const erreurs: string[] = []

  for (const c of body.commandes) {
    if (!c.fournisseur?.trim()) {
      erreurs.push(`Commande ignorée : fournisseur manquant`)
      continue
    }

    try {
      const commande = await prisma.commande.create({
        data: {
          fournisseur: c.fournisseur,
          date: c.date ? new Date(c.date) : new Date(),
          statut: c.statut || 'En préparation',
          tracking: c.tracking || null,
          notes: c.notes || null,
        },
      })
      nbCommandes++

      for (const a of c.articles ?? []) {
        if (!a.marque?.trim() || !a.modele?.trim()) {
          erreurs.push(`Article ignoré dans "${c.fournisseur}" : marque ou modèle manquant`)
          continue
        }
        await prisma.article.create({
          data: {
            commandeId: commande.id,
            marque: a.marque,
            modele: a.modele,
            prixAchat: Math.max(0, Number(a.prixAchat) || 0),
            etat: a.etat || 'Très bon état',
            refFournisseur: a.refFournisseur || null,
            statut: a.statut || 'En stock',
            prixVente: a.prixVente ? Math.max(0, Number(a.prixVente)) : null,
            plateforme: a.plateforme || null,
            prixVenteReel: a.prixVenteReel ? Math.max(0, Number(a.prixVenteReel)) : null,
            fraisVente: a.fraisVente ? Math.max(0, Number(a.fraisVente)) : null,
            dateVente: a.dateVente ? new Date(a.dateVente) : null,
          },
        })
        nbArticles++
      }

      for (const f of c.frais ?? []) {
        if (!f.type?.trim()) continue
        await prisma.frais.create({
          data: {
            commandeId: commande.id,
            type: f.type || 'Autre',
            montant: Math.max(0, Number(f.montant) || 0),
            description: f.description || null,
          },
        })
        nbFrais++
      }
    } catch {
      erreurs.push(`Erreur lors de l'import de la commande "${c.fournisseur}"`)
    }
  }

  return NextResponse.json({ nbCommandes, nbArticles, nbFrais, erreurs })
}
