-- CreateIndex
CREATE INDEX "settlements_group_id_from_user_id_to_user_id_status_idx" ON "settlements"("group_id", "from_user_id", "to_user_id", "status");
