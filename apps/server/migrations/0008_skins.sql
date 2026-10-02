CREATE TYPE "skin_kind" AS ENUM('full', 'piece');

CREATE TYPE "skin_variant" AS ENUM('classic', 'slim');

CREATE TYPE "skin_piece_slot" AS ENUM(
    'hair',
    'face',
    'headwear',
    'top',
    'jacket',
    'sleeve_left',
    'sleeve_right',
    'legs',
    'shoes',
    'accessory',
    'other'
);

CREATE TABLE "skins" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "slug" text NOT NULL UNIQUE,
    "name" text NOT NULL,
    "description" text NOT NULL DEFAULT '',
    "kind" skin_kind NOT NULL DEFAULT 'full',
    "piece_slot" skin_piece_slot,
    "variant" skin_variant NOT NULL DEFAULT 'classic',
    "image_url" text NOT NULL,
    "tags" text[],
    "author_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "remixed_from" uuid[],
    "downloads" integer NOT NULL DEFAULT 0,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "users" ADD COLUMN "featured_skin_id" uuid REFERENCES "skins"("id") ON DELETE SET NULL;
