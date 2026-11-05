SET local check_function_bodies = off;

CREATE TABLE "public"."budgets" (
  "id"          uuid          NOT NULL DEFAULT gen_random_uuid(),
  "user_id"     uuid          NOT NULL,
  "category_id" uuid,
  "amount"      numeric(18,2) NOT NULL,
  CONSTRAINT "budgets_amount_check" CHECK ((amount > (0)::numeric)),
  CONSTRAINT "budgets_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."budgets"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."categories" (
  "id"        uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id"   uuid NOT NULL,
  "parent_id" uuid,
  "name"      text NOT NULL,
  "icon"      text DEFAULT '📁'::text,
  "color"     text DEFAULT '#6B7280'::text,
  CONSTRAINT "categories_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."categories"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."profiles" (
  "id"         uuid                     NOT NULL,
  "full_name"  text,
  "avatar_url" text,
  "currency"   text                     NOT NULL DEFAULT 'VND'::text,
  "locale"     text                     NOT NULL DEFAULT 'vi-VN'::text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "profiles_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."profiles"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."recurring_transactions" (
  "id"          uuid          NOT NULL DEFAULT gen_random_uuid(),
  "user_id"     uuid          NOT NULL,
  "wallet_id"   uuid          NOT NULL,
  "category_id" uuid,
  "amount"      numeric(18,2) NOT NULL,
  CONSTRAINT "recurring_transactions_amount_check" CHECK ((amount > (0)::numeric)),
  CONSTRAINT "recurring_transactions_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."recurring_transactions"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."transactions" (
  "id"           uuid          NOT NULL DEFAULT gen_random_uuid(),
  "user_id"      uuid          NOT NULL,
  "wallet_id"    uuid          NOT NULL,
  "category_id"  uuid,
  "to_wallet_id" uuid,
  "amount"       numeric(18,2) NOT NULL,
  CONSTRAINT "transactions_amount_check" CHECK ((amount > (0)::numeric)),
  CONSTRAINT "transactions_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."transactions"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."wallets" (
  "id"      uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "name"    text NOT NULL,
  CONSTRAINT "wallets_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."wallets"
  ENABLE ROW LEVEL SECURITY;

CREATE TYPE "public"."budget_period" AS ENUM (
  'weekly',
  'monthly',
  'yearly'
);

ALTER TABLE "public"."budgets"
  ADD COLUMN "period" public.budget_period NOT NULL DEFAULT 'monthly'::public.budget_period;

ALTER TABLE "public"."budgets"
  ADD COLUMN "month" date NOT NULL;

ALTER TABLE "public"."budgets"
  ADD COLUMN "created_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."budgets"
  ADD COLUMN "updated_at" timestamp WITH time zone NOT NULL DEFAULT now();

CREATE TYPE "public"."recurring_frequency" AS ENUM (
  'daily',
  'weekly',
  'monthly',
  'yearly'
);

CREATE TYPE "public"."transaction_type" AS ENUM (
  'income',
  'expense',
  'transfer'
);

ALTER TABLE "public"."categories"
  ADD COLUMN "type" public.transaction_type NOT NULL;

ALTER TABLE "public"."categories"
  ADD COLUMN "sort_order" integer NOT NULL DEFAULT 0;

ALTER TABLE "public"."categories"
  ADD COLUMN "is_system" boolean NOT NULL DEFAULT false;

ALTER TABLE "public"."categories"
  ADD COLUMN "created_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."recurring_transactions"
  ADD COLUMN "type" public.transaction_type NOT NULL;

ALTER TABLE "public"."recurring_transactions"
  ADD COLUMN "note" text;

ALTER TABLE "public"."recurring_transactions"
  ADD COLUMN "frequency" public.recurring_frequency NOT NULL;

ALTER TABLE "public"."recurring_transactions"
  ADD COLUMN "next_run_date" date NOT NULL;

ALTER TABLE "public"."recurring_transactions"
  ADD COLUMN "end_date" date;

ALTER TABLE "public"."recurring_transactions"
  ADD COLUMN "is_active" boolean NOT NULL DEFAULT true;

ALTER TABLE "public"."recurring_transactions"
  ADD COLUMN "created_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."recurring_transactions"
  ADD COLUMN "updated_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."transactions"
  ADD COLUMN "type" public.transaction_type NOT NULL;

ALTER TABLE "public"."transactions"
  ADD COLUMN "note" text;

ALTER TABLE "public"."transactions"
  ADD COLUMN "transaction_date" date NOT NULL DEFAULT CURRENT_DATE;

ALTER TABLE "public"."transactions"
  ADD COLUMN "receipt_url" text;

ALTER TABLE "public"."transactions"
  ADD COLUMN "is_recurring" boolean NOT NULL DEFAULT false;

ALTER TABLE "public"."transactions"
  ADD COLUMN "recurring_id" uuid;

ALTER TABLE "public"."transactions"
  ADD COLUMN "created_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."transactions"
  ADD COLUMN "updated_at" timestamp WITH time zone NOT NULL DEFAULT now();

CREATE TYPE "public"."wallet_type" AS ENUM (
  'cash',
  'bank',
  'credit_card',
  'e_wallet',
  'savings'
);

ALTER TABLE "public"."wallets"
  ADD COLUMN "type" public.wallet_type NOT NULL DEFAULT 'cash'::public.wallet_type;

ALTER TABLE "public"."wallets"
  ADD COLUMN "balance" numeric(18,2) NOT NULL DEFAULT 0;

ALTER TABLE "public"."wallets"
  ADD COLUMN "currency" text NOT NULL DEFAULT 'VND'::text;

ALTER TABLE "public"."wallets"
  ADD COLUMN "color" text DEFAULT '#3B82F6'::text;

ALTER TABLE "public"."wallets"
  ADD COLUMN "icon" text DEFAULT '💰'::text;

ALTER TABLE "public"."wallets"
  ADD COLUMN "is_archived" boolean NOT NULL DEFAULT false;

ALTER TABLE "public"."wallets"
  ADD COLUMN "created_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."wallets"
  ADD COLUMN "updated_at" timestamp WITH time zone NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
  RETURNS event_trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'pg_catalog'
  AS $function$
DECLARE
  cmd record;
  tbl name;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        SELECT c.relname INTO tbl FROM pg_catalog.pg_class c WHERE c.oid = cmd.objid;
        EXECUTE format('alter table if exists %I.%I enable row level security', cmd.schema_name, tbl);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

ALTER TABLE "public"."budgets"
  ADD CONSTRAINT "budgets_user_id_category_id_month_key" UNIQUE (user_id, category_id, month);

ALTER TABLE "public"."budgets"
  ADD CONSTRAINT "budgets_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."budgets"
  ADD CONSTRAINT "budgets_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;

ALTER TABLE "public"."categories"
  ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE SET NULL;

ALTER TABLE "public"."categories"
  ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."recurring_transactions"
  ADD CONSTRAINT "recurring_transactions_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;

ALTER TABLE "public"."recurring_transactions"
  ADD CONSTRAINT "recurring_transactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."transactions"
  ADD CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;

ALTER TABLE "public"."transactions"
  ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."recurring_transactions"
  ADD CONSTRAINT "recurring_transactions_wallet_id_fkey" FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON DELETE RESTRICT;

ALTER TABLE "public"."transactions"
  ADD CONSTRAINT "transactions_to_wallet_id_fkey" FOREIGN KEY (to_wallet_id) REFERENCES public.wallets(id) ON DELETE SET NULL;

ALTER TABLE "public"."transactions"
  ADD CONSTRAINT "transactions_wallet_id_fkey" FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON DELETE RESTRICT;

ALTER TABLE "public"."wallets"
  ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX idx_budgets_user_month ON public.budgets USING btree (user_id, month DESC);

CREATE INDEX idx_categories_parent_id ON public.categories USING btree (parent_id);

CREATE INDEX idx_categories_user_id ON public.categories USING btree (user_id);

CREATE INDEX idx_categories_user_type ON public.categories USING btree (user_id, TYPE);

CREATE INDEX idx_recurring_next_run ON public.recurring_transactions USING btree (next_run_date)
  WHERE (is_active = true);

CREATE INDEX idx_recurring_user_active ON public.recurring_transactions USING btree (user_id, is_active);

CREATE INDEX idx_transactions_category_id ON public.transactions USING btree (category_id);

CREATE INDEX idx_transactions_type_date ON public.transactions USING btree (user_id, TYPE, transaction_date DESC);

CREATE INDEX idx_transactions_user_date ON public.transactions USING btree (user_id, transaction_date DESC);

CREATE INDEX idx_transactions_user_id ON public.transactions USING btree (user_id);

CREATE INDEX idx_transactions_wallet_id ON public.transactions USING btree (wallet_id);

CREATE INDEX idx_wallets_user_active ON public.wallets USING btree (user_id)
  WHERE (is_archived = false);

CREATE INDEX idx_wallets_user_id ON public.wallets USING btree (user_id);

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.recurring_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE EVENT TRIGGER "ensure_rls"
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION "public"."rls_auto_enable"();

COMMENT ON TABLE "public"."profiles" IS 'Thông tin bổ sung của user, mở rộng từ auth.users';

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."handle_updated_at"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."handle_updated_at"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."handle_updated_at"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."handle_updated_at"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."rls_auto_enable"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."rls_auto_enable"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."rls_auto_enable"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."rls_auto_enable"() TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."budgets" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."budgets" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."budgets" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."budgets" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."categories" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."categories" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."categories" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."categories" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."profiles" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."recurring_transactions" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."recurring_transactions" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."recurring_transactions" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."recurring_transactions" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."transactions" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."transactions" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."transactions" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."transactions" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."wallets" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."wallets" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."wallets" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."wallets" TO "service_role";

