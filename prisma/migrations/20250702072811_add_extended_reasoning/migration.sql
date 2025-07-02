-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "metadata" JSONB DEFAULT '{}',
ADD COLUMN     "reasoning" JSONB;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "extendedReasoningEnabled" BOOLEAN NOT NULL DEFAULT false;
