CREATE TYPE "public"."game_version" AS ENUM('26.40', '26.30', '26.20', '26.10', '1.21.90', '1.21.80', '1.21.70');--> statement-breakpoint
CREATE TYPE "public"."project_environment" AS ENUM('client', 'server', 'both');--> statement-breakpoint
CREATE TYPE "public"."project_loader" AS ENUM('amethyst', 'levilamina', 'flarial', 'latite');--> statement-breakpoint
CREATE TYPE "public"."resource_pack_resolution" AS ENUM('16x', '32x', '64x', '128x');--> statement-breakpoint
CREATE TABLE "project_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"version" text NOT NULL,
	"changelog" text,
	"game_versions" "game_version"[] NOT NULL,
	"loaders" "project_loader"[],
	"environments" "project_environment"[],
	"resolutions" "resource_pack_resolution"[],
	"file_name" text NOT NULL,
	"file_path" text NOT NULL,
	"file_size" integer NOT NULL,
	"downloads" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_versions" ADD CONSTRAINT "project_versions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;