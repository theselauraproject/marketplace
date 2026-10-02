-- Likes ("hearts") on projects, plus a denormalized count so listing/
-- sorting by popularity doesn't need a COUNT(*) join on every request.
ALTER TABLE "projects" ADD COLUMN "likes_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint

CREATE TABLE "project_likes" (
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_likes_pkey" PRIMARY KEY ("project_id", "user_id")
);
--> statement-breakpoint

ALTER TABLE "project_likes" ADD CONSTRAINT "project_likes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "project_likes" ADD CONSTRAINT "project_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- Used both to list "projects you've liked" and, later, as the input signal
-- for a recommendation query (liked projects' tags/types -> similar ones).
CREATE INDEX "project_likes_user_id_idx" ON "project_likes" ("user_id");
