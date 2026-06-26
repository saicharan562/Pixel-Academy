-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "price_min_inr" DECIMAL(14,2),
    "price_max_inr" DECIMAL(14,2),
    "unit" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_items" (
    "id" UUID NOT NULL,
    "category" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "price_inr" DECIMAL(14,2),
    "quantity" TEXT,
    "billing_type" TEXT,
    "client_id" UUID,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "advance_note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "work_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_records" (
    "id" UUID NOT NULL,
    "month" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "salary_inr" DECIMAL(14,2) NOT NULL,
    "bonus_inr" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "incentive_inr" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "deduction_inr" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "net_salary_inr" DECIMAL(14,2) NOT NULL,
    "paid_date" DATE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "salary_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_workitem_category" ON "work_items"("category");

-- CreateIndex
CREATE INDEX "idx_workitem_status" ON "work_items"("status");

-- CreateIndex
CREATE UNIQUE INDEX "salary_records_user_id_month_key" ON "salary_records"("user_id", "month");

-- AddForeignKey
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_records" ADD CONSTRAINT "salary_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
