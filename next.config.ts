/** @type {import('next').NextConfig} */
const nextConfig = {
  // This allows HMR to work when accessing via your Network IP
  allowedDevOrigins: ['192.168.29.183', 'localhost'],
}

module.exports = nextConfig