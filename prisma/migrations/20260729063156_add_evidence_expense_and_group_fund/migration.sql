-- AlterTable
ALTER TABLE "fund_transactions" ADD COLUMN     "evidence_url" TEXT;

-- AlterTable
ALTER TABLE "group_funds" ADD COLUMN     "target_amount" DECIMAL(18,2);
