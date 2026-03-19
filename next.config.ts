import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
   serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
   output: "standalone",
};

export default nextConfig;
