const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  disable: process.env.NODE_ENV === "development", // This disables PWA caching while you are coding/testing
  register: true,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // This allows HMR to work when accessing via your Network IP
  // Note: Depending on your Next.js version, this might need to be inside experimental: { allowedDevOrigins: [...] }
  allowedDevOrigins: ['192.168.29.183', 'localhost'],
  
  // This silences the Next.js 16 Turbopack error
  turbopack: {},
};

module.exports = withPWA(nextConfig);