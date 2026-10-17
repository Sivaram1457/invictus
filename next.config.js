/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Allows Next.js <Image /> component to render remote images securely
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co', // Supabase Storage
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com', // Cloudinary Storage
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com', // Placeholder test photos
      },
    ],
  },
};

module.exports = nextConfig;