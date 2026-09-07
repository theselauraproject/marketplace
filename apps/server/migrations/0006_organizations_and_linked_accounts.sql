CREATE TABLE "organizations" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "github_id" text NOT NULL UNIQUE,
    "login" text NOT NULL,
    "name" text,
    "avatar_url" text,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "organization_members" (
    "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY ("org_id", "user_id")
);

CREATE TABLE "linked_accounts" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_a_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "user_b_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "linked_accounts_no_self_link" CHECK ("user_a_id" <> "user_b_id"),
    CONSTRAINT "linked_accounts_unique_pair" UNIQUE ("user_a_id", "user_b_id")
);

ALTER TABLE "sessions" ADD COLUMN "acting_as_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "sessions" ADD COLUMN "acting_as_org_id" uuid REFERENCES "organizations"("id") ON DELETE SET NULL;
ALTER TABLE "projects" ADD COLUMN "owner_org_id" uuid REFERENCES "organizations"("id") ON DELETE SET NULL;