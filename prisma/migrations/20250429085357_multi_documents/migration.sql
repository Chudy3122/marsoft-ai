-- DropIndex
DROP INDEX "Document_chatId_key";

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "content" DROP NOT NULL,
ALTER COLUMN "metadata" DROP NOT NULL,
ALTER COLUMN "metadata" SET DEFAULT '{}';

-- CreateIndex
CREATE INDEX "Document_chatId_idx" ON "Document"("chatId");
