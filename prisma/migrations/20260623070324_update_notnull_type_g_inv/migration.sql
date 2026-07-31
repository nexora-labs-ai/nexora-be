/*
  Warnings:

  - Made the column `group_id` on table `group_invitations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `email` on table `group_invitations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `invited_by` on table `group_invitations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `token` on table `group_invitations` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "group_invitations" DROP CONSTRAINT "group_invitations_invited_by_fkey";

-- AlterTable
ALTER TABLE "group_invitations" ALTER COLUMN "group_id" SET NOT NULL,
ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "invited_by" SET NOT NULL,
ALTER COLUMN "token" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "group_invitations" ADD CONSTRAINT "group_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
