ALTER TABLE "skins" ADD COLUMN "owner_org_id" uuid REFERENCES "organizations"("id") ON DELETE SET NULL;
ALTER TABLE "organizations" ADD COLUMN "featured_skin_id" uuid REFERENCES "skins"("id") ON DELETE SET NULL;
