import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * Cloudflare Workers adapter for Next.js.
 * The default (no incremental cache) is correct for this architecture: the
 * catalogue, dashboards and APIs are dynamic, and public pages revalidate via
 * the app server. Add an R2 incremental cache later if ISR volume grows.
 */
export default {
  ...defineCloudflareConfig({}),
  // The top-level `npm run build` is the Cloudflare/OpenNext build. Point
  // OpenNext's inner Next.js build at `build:next` so it does not recurse.
  buildCommand: "npm run build:next",
};
