-- DropIndex
DROP INDEX "Document_chatId_key";

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false;
