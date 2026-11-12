import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@aural/shared'],
  serverExternalPackages: ['exceljs'],
  experimental: { serverActions: { bodySizeLimit: '10mb' } },
};

export default nextConfig;
