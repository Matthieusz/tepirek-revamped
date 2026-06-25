ALTER TABLE "range" ADD COLUMN IF NOT EXISTS "slug" text;
--> statement-breakpoint
UPDATE "range"
SET "slug" = trim(
  both '-' from regexp_replace(
    regexp_replace(
      regexp_replace(
        lower(
          translate(
            trim("name"),
            'ĄĆĘŁŃÓŚŹŻąćęłńóśźż',
            'ACELNOSZZacelnoszz'
          )
        ),
        '\s+',
        '-',
        'g'
      ),
      '[^a-z0-9-]',
      '',
      'g'
    ),
    '-+',
    '-',
    'g'
  )
)
WHERE "slug" IS NULL OR "slug" = '';
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "range" WHERE "slug" = '') THEN
    RAISE EXCEPTION 'Cannot backfill range.slug: at least one range name produces an empty slug';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "range"
    GROUP BY "slug"
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add unique constraint to range.slug: duplicate slugs exist';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "range" ALTER COLUMN "slug" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "range" ADD CONSTRAINT "range_slug_unique" UNIQUE ("slug");
