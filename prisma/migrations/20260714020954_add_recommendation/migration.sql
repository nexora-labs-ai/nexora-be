-- CreateTable
CREATE TABLE "recommendation_likes" (
    "id" UUID NOT NULL,
    "recommendation_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendation_likes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recommendation_likes_recommendation_id_idx" ON "recommendation_likes"("recommendation_id");

-- CreateIndex
CREATE INDEX "recommendation_likes_user_id_idx" ON "recommendation_likes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "recommendation_likes_recommendation_id_user_id_key" ON "recommendation_likes"("recommendation_id", "user_id");

-- AddForeignKey
ALTER TABLE "recommendation_likes" ADD CONSTRAINT "recommendation_likes_recommendation_id_fkey" FOREIGN KEY ("recommendation_id") REFERENCES "recommendations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_likes" ADD CONSTRAINT "recommendation_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
