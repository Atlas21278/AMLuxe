const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('Admin2024!', 12)

  const user = await prisma.user.upsert({
    where: { email: 'admin@amluxe.fr' },
    update: {},
    create: {
      email: 'admin@amluxe.fr',
      nom: 'Administrateur',
      motDePasse: hashedPassword,
      role: 'admin',
    },
  })

  console.log('✓ Admin créé :', user.email)
  console.log('  Mot de passe : Admin2024!')
  console.log('  → Changez ce mot de passe après la première connexion !')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
