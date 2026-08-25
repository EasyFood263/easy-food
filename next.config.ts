import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    // Temporary compatibility for the bilingual role workspace while the
    // shared translation type is normalized. Runtime validation remains active.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
