/*
  Warnings:

  - Added the required column `createdBy` to the `knowledge_categories` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "knowledge_categories" ADD COLUMN     "createdBy" TEXT NOT NULL,
ADD COLUMN     "createdByName" TEXT,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "password" TEXT;
