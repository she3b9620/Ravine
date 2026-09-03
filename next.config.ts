import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
