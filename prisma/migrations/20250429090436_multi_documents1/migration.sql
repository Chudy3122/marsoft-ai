/*
  Warnings:

  - You are about to drop the column `active` on the `Document` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[chatId]` on the table `Document` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Document" DROP COLUMN "active";

-- CreateIndex
CREATE UNIQUE INDEX "Document_chatId_key" ON "Document"("chatId");
