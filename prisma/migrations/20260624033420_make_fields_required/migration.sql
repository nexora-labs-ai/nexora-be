/*
  Warnings:

  - You are about to drop the column `end_date` on the `itineraries` table. All the data in the column will be lost.
  - You are about to drop the column `start_date` on the `itineraries` table. All the data in the column will be lost.
  - You are about to drop the column `end_time` on the `itinerary_items` table. All the data in the column will be lost.
  - You are about to drop the column `start_time` on the `itinerary_items` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[token]` on the table `refresh_tokens` will be added. If there are existing duplicate values, this will fail.
  - Made the column `user_id` on table `ai_conversations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `ai_conversations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `ai_conversations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `conversation_id` on table `ai_messages` required. This step will fail if there are existing NULL values in that column.
  - Made the column `role` on table `ai_messages` required. This step will fail if there are existing NULL values in that column.
  - Made the column `content` on table `ai_messages` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `ai_messages` required. This step will fail if there are existing NULL values in that column.
  - Made the column `name` on table `categories` required. This step will fail if there are existing NULL values in that column.
  - Made the column `icon` on table `categories` required. This step will fail if there are existing NULL values in that column.
  - Made the column `color` on table `categories` required. This step will fail if there are existing NULL values in that column.
  - Made the column `is_default` on table `categories` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `categories` required. This step will fail if there are existing NULL values in that column.
  - Made the column `expense_id` on table `expense_attachments` required. This step will fail if there are existing NULL values in that column.
  - Made the column `uploaded_by` on table `expense_attachments` required. This step will fail if there are existing NULL values in that column.
  - Made the column `file_url` on table `expense_attachments` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `expense_attachments` required. This step will fail if there are existing NULL values in that column.
  - Made the column `expense_id` on table `expense_payers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `user_id` on table `expense_payers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `amount` on table `expense_payers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `expense_id` on table `expense_splits` required. This step will fail if there are existing NULL values in that column.
  - Made the column `user_id` on table `expense_splits` required. This step will fail if there are existing NULL values in that column.
  - Made the column `amount` on table `expense_splits` required. This step will fail if there are existing NULL values in that column.
  - Made the column `is_paid` on table `expense_splits` required. This step will fail if there are existing NULL values in that column.
  - Made the column `group_id` on table `expenses` required. This step will fail if there are existing NULL values in that column.
  - Made the column `category_id` on table `expenses` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_by` on table `expenses` required. This step will fail if there are existing NULL values in that column.
  - Made the column `title` on table `expenses` required. This step will fail if there are existing NULL values in that column.
  - Made the column `amount` on table `expenses` required. This step will fail if there are existing NULL values in that column.
  - Made the column `currency` on table `expenses` required. This step will fail if there are existing NULL values in that column.
  - Made the column `funding_source` on table `expenses` required. This step will fail if there are existing NULL values in that column.
  - Made the column `split_type` on table `expenses` required. This step will fail if there are existing NULL values in that column.
  - Made the column `date` on table `expenses` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `expenses` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `expenses` required. This step will fail if there are existing NULL values in that column.
  - Made the column `fund_id` on table `fund_transactions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_by` on table `fund_transactions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `type` on table `fund_transactions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `amount` on table `fund_transactions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `fund_transactions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `group_id` on table `group_funds` required. This step will fail if there are existing NULL values in that column.
  - Made the column `balance` on table `group_funds` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `group_funds` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `group_funds` required. This step will fail if there are existing NULL values in that column.
  - Made the column `expires_at` on table `group_invitations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `group_invitations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `group_id` on table `group_members` required. This step will fail if there are existing NULL values in that column.
  - Made the column `user_id` on table `group_members` required. This step will fail if there are existing NULL values in that column.
  - Made the column `role` on table `group_members` required. This step will fail if there are existing NULL values in that column.
  - Made the column `joined_at` on table `group_members` required. This step will fail if there are existing NULL values in that column.
  - Made the column `name` on table `groups` required. This step will fail if there are existing NULL values in that column.
  - Made the column `currency` on table `groups` required. This step will fail if there are existing NULL values in that column.
  - Made the column `is_active` on table `groups` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `groups` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `groups` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `endDate` to the `itineraries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startDate` to the `itineraries` table without a default value. This is not possible if the table is not empty.
  - Made the column `group_id` on table `itineraries` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_by` on table `itineraries` required. This step will fail if there are existing NULL values in that column.
  - Made the column `title` on table `itineraries` required. This step will fail if there are existing NULL values in that column.
  - Made the column `destination` on table `itineraries` required. This step will fail if there are existing NULL values in that column.
  - Made the column `status` on table `itineraries` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `itineraries` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `itineraries` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `endTime` to the `itinerary_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startTime` to the `itinerary_items` table without a default value. This is not possible if the table is not empty.
  - Made the column `itinerary_id` on table `itinerary_items` required. This step will fail if there are existing NULL values in that column.
  - Made the column `title` on table `itinerary_items` required. This step will fail if there are existing NULL values in that column.
  - Made the column `order_no` on table `itinerary_items` required. This step will fail if there are existing NULL values in that column.
  - Made the column `email_enabled` on table `notification_settings` required. This step will fail if there are existing NULL values in that column.
  - Made the column `push_enabled` on table `notification_settings` required. This step will fail if there are existing NULL values in that column.
  - Made the column `expense_alert` on table `notification_settings` required. This step will fail if there are existing NULL values in that column.
  - Made the column `settlement_alert` on table `notification_settings` required. This step will fail if there are existing NULL values in that column.
  - Made the column `recommendation_alert` on table `notification_settings` required. This step will fail if there are existing NULL values in that column.
  - Made the column `user_id` on table `notifications` required. This step will fail if there are existing NULL values in that column.
  - Made the column `type` on table `notifications` required. This step will fail if there are existing NULL values in that column.
  - Made the column `title` on table `notifications` required. This step will fail if there are existing NULL values in that column.
  - Made the column `body` on table `notifications` required. This step will fail if there are existing NULL values in that column.
  - Made the column `is_read` on table `notifications` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `notifications` required. This step will fail if there are existing NULL values in that column.
  - Made the column `group_id` on table `recommendations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_by` on table `recommendations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `type` on table `recommendations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `title` on table `recommendations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `content` on table `recommendations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `recommendations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `token` on table `refresh_tokens` required. This step will fail if there are existing NULL values in that column.
  - Made the column `user_id` on table `refresh_tokens` required. This step will fail if there are existing NULL values in that column.
  - Made the column `expires_at` on table `refresh_tokens` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `refresh_tokens` required. This step will fail if there are existing NULL values in that column.
  - Made the column `group_id` on table `settlements` required. This step will fail if there are existing NULL values in that column.
  - Made the column `from_user_id` on table `settlements` required. This step will fail if there are existing NULL values in that column.
  - Made the column `to_user_id` on table `settlements` required. This step will fail if there are existing NULL values in that column.
  - Made the column `amount` on table `settlements` required. This step will fail if there are existing NULL values in that column.
  - Made the column `currency` on table `settlements` required. This step will fail if there are existing NULL values in that column.
  - Made the column `status` on table `settlements` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `settlements` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `settlements` required. This step will fail if there are existing NULL values in that column.
  - Made the column `user_id` on table `user_auth_accounts` required. This step will fail if there are existing NULL values in that column.
  - Made the column `provider` on table `user_auth_accounts` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `user_auth_accounts` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `user_auth_accounts` required. This step will fail if there are existing NULL values in that column.
  - Made the column `display_name` on table `user_profiles` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `user_profiles` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `user_profiles` required. This step will fail if there are existing NULL values in that column.
  - Made the column `email` on table `users` required. This step will fail if there are existing NULL values in that column.
  - Made the column `role` on table `users` required. This step will fail if there are existing NULL values in that column.
  - Made the column `status` on table `users` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `users` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "ai_conversations" DROP CONSTRAINT "ai_conversations_user_id_fkey";

-- DropForeignKey
ALTER TABLE "expense_attachments" DROP CONSTRAINT "expense_attachments_uploaded_by_fkey";

-- DropForeignKey
ALTER TABLE "expense_payers" DROP CONSTRAINT "expense_payers_user_id_fkey";

-- DropForeignKey
ALTER TABLE "expense_splits" DROP CONSTRAINT "expense_splits_user_id_fkey";

-- DropForeignKey
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_category_id_fkey";

-- DropForeignKey
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_created_by_fkey";

-- DropForeignKey
ALTER TABLE "fund_transactions" DROP CONSTRAINT "fund_transactions_created_by_fkey";

-- DropForeignKey
ALTER TABLE "itineraries" DROP CONSTRAINT "itineraries_created_by_fkey";

-- DropForeignKey
ALTER TABLE "recommendations" DROP CONSTRAINT "recommendations_created_by_fkey";

-- DropForeignKey
ALTER TABLE "settlements" DROP CONSTRAINT "settlements_from_user_id_fkey";

-- DropForeignKey
ALTER TABLE "settlements" DROP CONSTRAINT "settlements_to_user_id_fkey";

-- AlterTable
ALTER TABLE "ai_conversations" ALTER COLUMN "user_id" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "ai_messages" ALTER COLUMN "conversation_id" SET NOT NULL,
ALTER COLUMN "role" SET NOT NULL,
ALTER COLUMN "content" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "categories" ALTER COLUMN "name" SET NOT NULL,
ALTER COLUMN "icon" SET NOT NULL,
ALTER COLUMN "color" SET NOT NULL,
ALTER COLUMN "is_default" SET NOT NULL,
ALTER COLUMN "is_default" SET DEFAULT false,
ALTER COLUMN "created_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "expense_attachments" ALTER COLUMN "expense_id" SET NOT NULL,
ALTER COLUMN "uploaded_by" SET NOT NULL,
ALTER COLUMN "file_url" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "expense_payers" ALTER COLUMN "expense_id" SET NOT NULL,
ALTER COLUMN "user_id" SET NOT NULL,
ALTER COLUMN "amount" SET NOT NULL;

-- AlterTable
ALTER TABLE "expense_splits" ALTER COLUMN "expense_id" SET NOT NULL,
ALTER COLUMN "user_id" SET NOT NULL,
ALTER COLUMN "amount" SET NOT NULL,
ALTER COLUMN "is_paid" SET NOT NULL,
ALTER COLUMN "is_paid" SET DEFAULT false;

-- AlterTable
ALTER TABLE "expenses" ALTER COLUMN "group_id" SET NOT NULL,
ALTER COLUMN "category_id" SET NOT NULL,
ALTER COLUMN "created_by" SET NOT NULL,
ALTER COLUMN "title" SET NOT NULL,
ALTER COLUMN "amount" SET NOT NULL,
ALTER COLUMN "currency" SET NOT NULL,
ALTER COLUMN "funding_source" SET NOT NULL,
ALTER COLUMN "funding_source" SET DEFAULT 'PERSONAL',
ALTER COLUMN "split_type" SET NOT NULL,
ALTER COLUMN "date" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "fund_transactions" ALTER COLUMN "fund_id" SET NOT NULL,
ALTER COLUMN "created_by" SET NOT NULL,
ALTER COLUMN "type" SET NOT NULL,
ALTER COLUMN "amount" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "group_funds" ALTER COLUMN "group_id" SET NOT NULL,
ALTER COLUMN "balance" SET NOT NULL,
ALTER COLUMN "balance" SET DEFAULT 0,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "group_invitations" ALTER COLUMN "expires_at" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "group_members" ALTER COLUMN "group_id" SET NOT NULL,
ALTER COLUMN "user_id" SET NOT NULL,
ALTER COLUMN "role" SET NOT NULL,
ALTER COLUMN "role" SET DEFAULT 'MEMBER',
ALTER COLUMN "joined_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "groups" ALTER COLUMN "name" SET NOT NULL,
ALTER COLUMN "currency" SET NOT NULL,
ALTER COLUMN "currency" SET DEFAULT 'VND',
ALTER COLUMN "is_active" SET NOT NULL,
ALTER COLUMN "is_active" SET DEFAULT true,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "itineraries" DROP COLUMN "end_date",
DROP COLUMN "start_date",
ADD COLUMN     "endDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "group_id" SET NOT NULL,
ALTER COLUMN "created_by" SET NOT NULL,
ALTER COLUMN "title" SET NOT NULL,
ALTER COLUMN "destination" SET NOT NULL,
ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'DRAFT',
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "itinerary_items" DROP COLUMN "end_time",
DROP COLUMN "start_time",
ADD COLUMN     "endTime" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "startTime" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "itinerary_id" SET NOT NULL,
ALTER COLUMN "title" SET NOT NULL,
ALTER COLUMN "order_no" SET NOT NULL;

-- AlterTable
ALTER TABLE "notification_settings" ALTER COLUMN "email_enabled" SET NOT NULL,
ALTER COLUMN "email_enabled" SET DEFAULT true,
ALTER COLUMN "push_enabled" SET NOT NULL,
ALTER COLUMN "push_enabled" SET DEFAULT true,
ALTER COLUMN "expense_alert" SET NOT NULL,
ALTER COLUMN "expense_alert" SET DEFAULT true,
ALTER COLUMN "settlement_alert" SET NOT NULL,
ALTER COLUMN "settlement_alert" SET DEFAULT true,
ALTER COLUMN "recommendation_alert" SET NOT NULL,
ALTER COLUMN "recommendation_alert" SET DEFAULT true;

-- AlterTable
ALTER TABLE "notifications" ALTER COLUMN "user_id" SET NOT NULL,
ALTER COLUMN "type" SET NOT NULL,
ALTER COLUMN "title" SET NOT NULL,
ALTER COLUMN "body" SET NOT NULL,
ALTER COLUMN "is_read" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "recommendations" ALTER COLUMN "group_id" SET NOT NULL,
ALTER COLUMN "created_by" SET NOT NULL,
ALTER COLUMN "type" SET NOT NULL,
ALTER COLUMN "title" SET NOT NULL,
ALTER COLUMN "content" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "refresh_tokens" ALTER COLUMN "token" SET NOT NULL,
ALTER COLUMN "user_id" SET NOT NULL,
ALTER COLUMN "expires_at" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "settlements" ALTER COLUMN "group_id" SET NOT NULL,
ALTER COLUMN "from_user_id" SET NOT NULL,
ALTER COLUMN "to_user_id" SET NOT NULL,
ALTER COLUMN "amount" SET NOT NULL,
ALTER COLUMN "currency" SET NOT NULL,
ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'PENDING',
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "user_auth_accounts" ALTER COLUMN "user_id" SET NOT NULL,
ALTER COLUMN "provider" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "user_profiles" ALTER COLUMN "display_name" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "role" SET NOT NULL,
ALTER COLUMN "role" SET DEFAULT 'USER',
ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'ACTIVE',
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- AddForeignKey
ALTER TABLE "fund_transactions" ADD CONSTRAINT "fund_transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_payers" ADD CONSTRAINT "expense_payers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_splits" ADD CONSTRAINT "expense_splits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_attachments" ADD CONSTRAINT "expense_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itineraries" ADD CONSTRAINT "itineraries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
