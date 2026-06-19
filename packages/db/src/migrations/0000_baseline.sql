CREATE TABLE "announcement" (
	"created_at" timestamp NOT NULL,
	"description" text NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auction_signups" (
	"column" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"level" integer NOT NULL,
	"profession" text NOT NULL,
	"round" integer NOT NULL,
	"type" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"access_token" text,
	"access_token_expires_at" timestamp,
	"account_id" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"id_token" text,
	"password" text,
	"provider_id" text NOT NULL,
	"refresh_token" text,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"updated_at" timestamp NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"created_at" timestamp NOT NULL,
	"expires_at" timestamp NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"ip_address" text,
	"token" text NOT NULL,
	"updated_at" timestamp NOT NULL,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"created_at" timestamp NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"image" text,
	"name" text NOT NULL,
	"role" text DEFAULT 'user',
	"updated_at" timestamp NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"created_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"updated_at" timestamp,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero" (
	"event_id" integer NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"image" text,
	"level" integer DEFAULT 1 NOT NULL,
	"name" text NOT NULL,
	"point_worth" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_bet" (
	"created_at" timestamp NOT NULL,
	"created_by" text NOT NULL,
	"hero_id" integer NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"member_count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_bet_member" (
	"hero_bet_id" integer NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"points" numeric(10, 2) NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "hero_bet_member_hero_bet_id_user_id_unique" UNIQUE("hero_bet_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "user_stats" (
	"bets" integer DEFAULT 0 NOT NULL,
	"earnings" numeric(20, 2) DEFAULT '0' NOT NULL,
	"event_id" integer NOT NULL,
	"hero_id" integer NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"paid_out" boolean DEFAULT false NOT NULL,
	"points" numeric(10, 2) DEFAULT '0' NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "user_stats_user_id_event_id_hero_id_unique" UNIQUE("user_id","event_id","hero_id")
);
--> statement-breakpoint
CREATE TABLE "event" (
	"active" boolean DEFAULT true,
	"color" text DEFAULT '#6366f1' NOT NULL,
	"end_time" timestamp NOT NULL,
	"icon" text DEFAULT 'calendar' NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "professions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "range" (
	"id" serial PRIMARY KEY NOT NULL,
	"image" text,
	"level" integer NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" serial PRIMARY KEY NOT NULL,
	"link" text NOT NULL,
	"mastery" boolean NOT NULL,
	"name" text NOT NULL,
	"profession_id" integer NOT NULL,
	"range_id" integer NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "todo" (
	"completed" boolean DEFAULT false NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero" ADD CONSTRAINT "hero_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_bet" ADD CONSTRAINT "hero_bet_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_bet" ADD CONSTRAINT "hero_bet_hero_id_hero_id_fk" FOREIGN KEY ("hero_id") REFERENCES "public"."hero"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_bet_member" ADD CONSTRAINT "hero_bet_member_hero_bet_id_hero_bet_id_fk" FOREIGN KEY ("hero_bet_id") REFERENCES "public"."hero_bet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_bet_member" ADD CONSTRAINT "hero_bet_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_hero_id_hero_id_fk" FOREIGN KEY ("hero_id") REFERENCES "public"."hero"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_profession_id_professions_id_fk" FOREIGN KEY ("profession_id") REFERENCES "public"."professions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_range_id_range_id_fk" FOREIGN KEY ("range_id") REFERENCES "public"."range"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todo" ADD CONSTRAINT "todo_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "announcement_user_id_idx" ON "announcement" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "announcement_created_at_idx" ON "announcement" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "profession_type_idx" ON "auction_signups" USING btree ("profession","type");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "hero_event_id_idx" ON "hero" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "hero_bet_hero_id_idx" ON "hero_bet" USING btree ("hero_id");--> statement-breakpoint
CREATE INDEX "hero_bet_created_at_idx" ON "hero_bet" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "hero_bet_member_bet_id_idx" ON "hero_bet_member" USING btree ("hero_bet_id");--> statement-breakpoint
CREATE INDEX "user_stats_event_id_idx" ON "user_stats" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "user_stats_hero_id_idx" ON "user_stats" USING btree ("hero_id");--> statement-breakpoint
CREATE INDEX "user_stats_paid_out_event_idx" ON "user_stats" USING btree ("paid_out","event_id");--> statement-breakpoint
CREATE INDEX "skills_range_id_idx" ON "skills" USING btree ("range_id");--> statement-breakpoint
CREATE INDEX "todo_user_id_idx" ON "todo" USING btree ("user_id");