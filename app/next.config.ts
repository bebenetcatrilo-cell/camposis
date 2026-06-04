import type { NextConfig } from 'next';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseHostname: string | undefined;
try {
  if (supabaseUrl) supabaseHostname = new URL(supabaseUrl).hostname;
} catch {
  // Ignorar si la URL aún no está definida
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: 'https',
            hostname: supabaseHostname,
            pathname: '/storage/v1/object/public/**',
          },
        ]
      : [],
  },
};

export default nextConfig;
