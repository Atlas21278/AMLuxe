-- CreateTable
CREATE TABLE "Commande" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fournisseur" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statut" TEXT NOT NULL DEFAULT 'En préparation',
    "tracking" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Article" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "marque" TEXT NOT NULL,
    "modele" TEXT NOT NULL,
    "prixAchat" REAL NOT NULL,
    "etat" TEXT NOT NULL,
    "refFournisseur" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'En stock',
    "prixVente" REAL,
    "plateforme" TEXT,
    "prixVenteReel" REAL,
    "fraisVente" REAL,
    "dateVente" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "commandeId" INTEGER NOT NULL,
    CONSTRAINT "Article_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "Commande" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Frais" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "montant" REAL NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "commandeId" INTEGER NOT NULL,
    CONSTRAINT "Frais_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "Commande" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
