-- CreateTable
CREATE TABLE "CustomerOrder" (
    "id" SERIAL NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "articleId" INTEGER NOT NULL,
    "marque" TEXT NOT NULL,
    "modele" TEXT NOT NULL,
    "prixArticle" DOUBLE PRECISION NOT NULL,
    "prixLivraison" DOUBLE PRECISION NOT NULL,
    "stripeSessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerOrder_stripeSessionId_key" ON "CustomerOrder"("stripeSessionId");

-- CreateIndex
CREATE INDEX "CustomerOrder_clerkUserId_idx" ON "CustomerOrder"("clerkUserId");
