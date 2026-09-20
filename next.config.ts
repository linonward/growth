import type { NextConfig } from "next";

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
};

export default nextConfig;
