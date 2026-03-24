-- CreateTable
CREATE TABLE "ArticleHistorique" (
    "id" SERIAL NOT NULL,
    "articleId" INTEGER NOT NULL,
    "champ" TEXT NOT NULL,
    "ancienne" TEXT,
    "nouvelle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleHistorique_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArticleHistorique_articleId_idx" ON "ArticleHistorique"("articleId");

-- AddForeignKey
ALTER TABLE "ArticleHistorique" ADD CONSTRAINT "ArticleHistorique_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
