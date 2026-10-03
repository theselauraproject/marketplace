import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default {
  ...defineCloudflareConfig(),
  buildCommand: "pnpm run build && node scripts/ensure-pages-manifest.mjs",
};