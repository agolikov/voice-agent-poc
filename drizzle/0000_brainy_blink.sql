CREATE TABLE "attempt" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"beat_id" text NOT NULL,
	"kind" text NOT NULL,
	"heard" text DEFAULT '' NOT NULL,
	"expected" text DEFAULT '' NOT NULL,
	"verdict" text,
	"correction" text DEFAULT '' NOT NULL,
	"category" text,
	"score" integer,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"event_id" integer,
	"role" text NOT NULL,
	"body" text NOT NULL,
	"recommended_terms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"agent_response_ms" integer,
	"model_response_ms" integer,
	"model_name" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenario" (
	"id" text PRIMARY KEY NOT NULL,
	"realization_key" text NOT NULL,
	"template_slug" text NOT NULL,
	"source" text NOT NULL,
	"target_language" text NOT NULL,
	"cefr_level" text NOT NULL,
	"title" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"scenario_id" text NOT NULL,
	"settings" jsonb NOT NULL,
	"conversation_id" text,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"outcome" text,
	"summary" text,
	"analysis" jsonb,
	"transcript" jsonb
);
--> statement-breakpoint
CREATE TABLE "template" (
	"slug" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "attempt_session_id_idx" ON "attempt" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "message_session_id_idx" ON "message" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "scenario_realization_key_idx" ON "scenario" USING btree ("realization_key");--> statement-breakpoint
CREATE INDEX "scenario_template_slug_idx" ON "scenario" USING btree ("template_slug");--> statement-breakpoint
CREATE INDEX "session_scenario_id_idx" ON "session" USING btree ("scenario_id");--> statement-breakpoint
CREATE INDEX "session_conversation_id_idx" ON "session" USING btree ("conversation_id");