import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    'three',
    '@react-three/fiber',
    '@react-three/drei',
    '@react-three/postprocessing',
    'postprocessing',
  ],
  // Empty turbopack config silences the Turbopack/webpack conflict warning
  turbopack: {},
};

export default nextConfig;
