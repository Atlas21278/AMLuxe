/**
 * scripts/cleanup-test-data.ts
 * Supprime toutes les données de test ([TEST]) de la base de données.
 * Les commandes ont le préfixe [TEST] dans le fournisseur.
 * Les articles sont supprimés en cascade avec la commande.
 *
 * Usage : npx tsx scripts/cleanup-test-data.ts
 * Ajouter --dry-run pour voir sans supprimer
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes('--dry-run')

async function main() {
  console.log(`\n🔍 Recherche des données de test [TEST]...\n`)

  // Trouver toutes les commandes [TEST] (incluant soft-deleted)
  const commandes = await prisma.commande.findMany({
    where: { fournisseur: { startsWith: '[TEST]' } },
    include: { articles: true, frais: true },
  })

  // Trouver les utilisateurs de test
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { nom: { startsWith: '[TEST]' } },
        { email: { endsWith: '@test-amluxe.internal' } },
      ],
    },
  })

  if (commandes.length === 0 && users.length === 0) {
    console.log('✅ Aucune donnée de test trouvée. La base est propre.')
    return
  }

  console.log(`📦 Commandes [TEST] trouvées : ${commandes.length}`)
  for (const c of commandes) {
    console.log(`   • #${c.id} "${c.fournisseur}" — ${c.articles.length} articles, ${c.frais.length} frais`)
  }

  console.log(`\n👤 Utilisateurs de test trouvés : ${users.length}`)
  for (const u of users) {
    console.log(`   • #${u.id} "${u.nom}" <${u.email}>`)
  }

  if (DRY_RUN) {
    console.log('\n⚠️  Mode --dry-run : rien n\'a été supprimé.')
    console.log('   Relance sans --dry-run pour supprimer réellement.\n')
    return
  }

  console.log('\n🗑️  Suppression en cours...')

  // Supprimer les commandes [TEST] (cascade → articles + frais)
  const { count } = await prisma.commande.deleteMany({
    where: { fournisseur: { startsWith: '[TEST]' } },
  })
  console.log(`   ✓ ${count} commande(s) supprimée(s) (+ articles et frais en cascade)`)

  // Supprimer les utilisateurs de test
  const { count: countUsers } = await prisma.user.deleteMany({
    where: {
      OR: [
        { nom: { startsWith: '[TEST]' } },
        { email: { endsWith: '@test-amluxe.internal' } },
      ],
    },
  })
  console.log(`   ✓ ${countUsers} utilisateur(s) de test supprimé(s)`)

  console.log('\n✅ Nettoyage terminé.\n')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
