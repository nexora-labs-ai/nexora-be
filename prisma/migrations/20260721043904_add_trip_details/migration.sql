-- AlterTable
ALTER TABLE "groups" ADD COLUMN     "budget_goal" DECIMAL(18,2),
ADD COLUMN     "end_date" TIMESTAMP(3),
ADD COLUMN     "start_date" TIMESTAMP(3);
