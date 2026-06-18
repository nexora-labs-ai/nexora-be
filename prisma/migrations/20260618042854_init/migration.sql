-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('LOCAL', 'GOOGLE', 'MEZON');

-- CreateEnum
CREATE TYPE "GroupRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateEnum
CREATE TYPE "ExpenseSplitType" AS ENUM ('EXACT', 'SHARES');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ItineraryStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "RecommendationType" AS ENUM ('RESTAURANT', 'CAFE', 'HOTEL', 'ACTIVITY', 'ITINERARY');

-- CreateEnum
CREATE TYPE "FundTransactionType" AS ENUM ('CONTRIBUTION', 'EXPENSE', 'REFUND');

-- CreateEnum
CREATE TYPE "FundingSource" AS ENUM ('PERSONAL', 'GROUP_FUND');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('VND', 'USD', 'EUR', 'JPY');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('EXPENSE_CREATED', 'EXPENSE_UPDATED', 'SETTLEMENT_REQUESTED', 'SETTLEMENT_COMPLETED', 'GROUP_INVITE', 'RECOMMENDATION_READY', 'ITINERARY_READY', 'SYSTEM');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT,
    "role" "UserRole",
    "status" "UserStatus",
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "user_id" UUID NOT NULL,
    "display_name" TEXT,
    "avatar_url" TEXT,
    "bio" TEXT,
    "phone" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "user_auth_accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "provider" "AuthProvider",
    "provider_user_id" TEXT,
    "password_hash" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "user_auth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_settings" (
    "user_id" UUID NOT NULL,
    "email_enabled" BOOLEAN,
    "push_enabled" BOOLEAN,
    "expense_alert" BOOLEAN,
    "settlement_alert" BOOLEAN,
    "recommendation_alert" BOOLEAN,

    CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "token" TEXT,
    "user_id" UUID,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "avatar_url" TEXT,
    "currency" "Currency",
    "is_active" BOOLEAN,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_members" (
    "id" UUID NOT NULL,
    "group_id" UUID,
    "user_id" UUID,
    "role" "GroupRole",
    "joined_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),

    CONSTRAINT "group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_invitations" (
    "id" UUID NOT NULL,
    "group_id" UUID,
    "email" TEXT,
    "invited_by" UUID,
    "token" TEXT,
    "expires_at" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_funds" (
    "id" UUID NOT NULL,
    "group_id" UUID,
    "balance" DECIMAL(65,30),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "group_funds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fund_transactions" (
    "id" UUID NOT NULL,
    "fund_id" UUID,
    "created_by" UUID,
    "expense_id" UUID,
    "type" "FundTransactionType",
    "amount" DECIMAL(65,30),
    "note" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fund_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "is_default" BOOLEAN,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL,
    "group_id" UUID,
    "category_id" UUID,
    "created_by" UUID,
    "title" TEXT,
    "description" TEXT,
    "amount" DECIMAL(65,30),
    "currency" "Currency",
    "funding_source" "FundingSource",
    "split_type" "ExpenseSplitType",
    "date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_payers" (
    "id" UUID NOT NULL,
    "expense_id" UUID,
    "user_id" UUID,
    "amount" DECIMAL(65,30),

    CONSTRAINT "expense_payers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_splits" (
    "id" UUID NOT NULL,
    "expense_id" UUID,
    "user_id" UUID,
    "amount" DECIMAL(65,30),
    "shares" INTEGER,
    "is_paid" BOOLEAN,
    "paid_at" TIMESTAMP(3),

    CONSTRAINT "expense_splits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_attachments" (
    "id" UUID NOT NULL,
    "expense_id" UUID,
    "uploaded_by" UUID,
    "file_url" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlements" (
    "id" UUID NOT NULL,
    "group_id" UUID,
    "from_user_id" UUID,
    "to_user_id" UUID,
    "amount" DECIMAL(65,30),
    "currency" "Currency",
    "status" "SettlementStatus",
    "note" TEXT,
    "settled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "group_id" UUID,
    "type" "NotificationType",
    "title" TEXT,
    "body" TEXT,
    "data" JSONB,
    "is_read" BOOLEAN DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itineraries" (
    "id" UUID NOT NULL,
    "group_id" UUID,
    "created_by" UUID,
    "title" TEXT,
    "description" TEXT,
    "destination" TEXT,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "status" "ItineraryStatus",
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "itineraries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itinerary_items" (
    "id" UUID NOT NULL,
    "itinerary_id" UUID,
    "title" TEXT,
    "description" TEXT,
    "location" TEXT,
    "start_time" TIMESTAMP(3),
    "end_time" TIMESTAMP(3),
    "estimated_cost" DECIMAL(65,30),
    "order_no" INTEGER,
    "notes" TEXT,

    CONSTRAINT "itinerary_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" UUID NOT NULL,
    "group_id" UUID,
    "created_by" UUID,
    "type" "RecommendationType",
    "title" TEXT,
    "content" JSONB,
    "metadata" JSONB,
    "score" DOUBLE PRECISION,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_conversations" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "group_id" UUID,
    "context" JSONB,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID,
    "role" TEXT,
    "content" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_auth_accounts_provider_provider_user_id_key" ON "user_auth_accounts"("provider", "provider_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_auth_accounts_user_id_provider_key" ON "user_auth_accounts"("user_id", "provider");

-- CreateIndex
CREATE INDEX "group_members_group_id_role_idx" ON "group_members"("group_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "group_members_group_id_user_id_key" ON "group_members"("group_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_invitations_token_key" ON "group_invitations"("token");

-- CreateIndex
CREATE UNIQUE INDEX "group_funds_group_id_key" ON "group_funds"("group_id");

-- CreateIndex
CREATE INDEX "fund_transactions_fund_id_created_at_idx" ON "fund_transactions"("fund_id", "created_at");

-- CreateIndex
CREATE INDEX "expenses_group_id_date_idx" ON "expenses"("group_id", "date");

-- CreateIndex
CREATE INDEX "expenses_created_by_idx" ON "expenses"("created_by");

-- CreateIndex
CREATE INDEX "expenses_category_id_idx" ON "expenses"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "expense_payers_expense_id_user_id_key" ON "expense_payers"("expense_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "expense_splits_expense_id_user_id_key" ON "expense_splits"("expense_id", "user_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "itinerary_items_itinerary_id_order_no_idx" ON "itinerary_items"("itinerary_id", "order_no");

-- CreateIndex
CREATE INDEX "ai_messages_conversation_id_created_at_idx" ON "ai_messages"("conversation_id", "created_at");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_auth_accounts" ADD CONSTRAINT "user_auth_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_invitations" ADD CONSTRAINT "group_invitations_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_invitations" ADD CONSTRAINT "group_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_funds" ADD CONSTRAINT "group_funds_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_transactions" ADD CONSTRAINT "fund_transactions_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "group_funds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_transactions" ADD CONSTRAINT "fund_transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_transactions" ADD CONSTRAINT "fund_transactions_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_payers" ADD CONSTRAINT "expense_payers_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_payers" ADD CONSTRAINT "expense_payers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_splits" ADD CONSTRAINT "expense_splits_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_splits" ADD CONSTRAINT "expense_splits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_attachments" ADD CONSTRAINT "expense_attachments_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_attachments" ADD CONSTRAINT "expense_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itineraries" ADD CONSTRAINT "itineraries_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itineraries" ADD CONSTRAINT "itineraries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_items" ADD CONSTRAINT "itinerary_items_itinerary_id_fkey" FOREIGN KEY ("itinerary_id") REFERENCES "itineraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
