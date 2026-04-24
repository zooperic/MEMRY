/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/**',
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['sharp'],
  },
  async headers() {
    return [
      {
        source: '/api/device/:id*',
        headers: [
          { key: 'Access-Control-Allow-Origin',  value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'If-None-Match, X-Device-ID, X-Battery-Mv' },
        ],
      },
    ]
  },
}
export default nextConfig
