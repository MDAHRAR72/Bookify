import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "covers.openlibrary.org" },
      {
        protocol: "https",
        hostname: "lspfdyhgsrgsxcju.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
