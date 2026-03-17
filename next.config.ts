import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: 'export', // Comentado para compatibilidad con Vercel standard
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
