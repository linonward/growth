import type { NextConfig } from "next";

/**
 * PostHog's UI and asset hosts, derived from the configured ingestion host so
 * both the US and EU regions work.
 *
 *   https://us.i.posthog.com -> https://us-assets.i.posthog.com
 *   https://eu.i.posthog.com -> https://eu-assets.i.posthog.com
 */
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";
const POSTHOG_ASSETS_HOST = POSTHOG_HOST.replace(
  /^(https:\/\/)([a-z]+)\.i\.posthog\.com$/,
  "$1$2-assets.i.posthog.com",
);

const nextConfig: NextConfig = {
  /**
   * Next 16 blocks cross-origin requests to dev resources (HMR, dev chunks) by
   * default. Without this, opening the dev server via 127.0.0.1 instead of
   * localhost leaves the client bundle blocked, so the app server-renders but
   * never hydrates. The E2E suite and manual testing both use these hosts.
   */
  allowedDevOrigins: ["localhost", "127.0.0.1"],

  /**
   * The dev indicator floats over the bottom-left corner, which is exactly
   * where the prototype's bottom navigation sits. Hiding it keeps the mobile
   * layout readable while developing; compile and runtime errors still surface.
   */
  devIndicators: false,

  /**
   * Reverse proxy for PostHog (PostHog's own Next.js guide recommends this).
   *
   * Tracking blockers ship rules for `posthog.com` and will silently drop
   * requests sent straight to it, which would quietly lose experiment data on
   * any family device running one. Routing through our own origin means the
   * browser only ever talks to this domain.
   *
   * See src/analytics/client.ts, which posts to `/ingest/...`.
   */
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: `${POSTHOG_ASSETS_HOST}/static/:path*`,
      },
      {
        source: "/ingest/:path*",
        destination: `${POSTHOG_HOST}/:path*`,
      },
    ];
  },
};

export default nextConfig;
