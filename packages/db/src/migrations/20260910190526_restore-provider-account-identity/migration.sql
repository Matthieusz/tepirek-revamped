DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'account'
      AND column_name = 'issuer'
  ) THEN
    RAISE EXCEPTION 'Expected account.issuer to exist before Better Auth 1.7.3 migration';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "account"
    GROUP BY "provider_id", "account_id"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot migrate Better Auth accounts: duplicate (provider_id, account_id) identities exist';
  END IF;
END $$;--> statement-breakpoint
DROP INDEX "account_issuer_account_id_unique";--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "issuer" DROP NOT NULL;