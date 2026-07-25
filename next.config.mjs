/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      // Pretty, SEO-friendly town URLs on the main domain. The page lives at
      // /town/[town]; the canonical URL stays /dog-groomers-in-{town}.
      { source: "/dog-groomers-in-:town", destination: "/town/:town" },
    ];
  },
};

export default nextConfig;
