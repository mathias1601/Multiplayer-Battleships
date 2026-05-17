import type { NextConfig } from 'next';


// Next on localhost:3000
// Server on localhost:3001
const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Polling hits /socket.io?EIO=... (no extra path) — :path* alone does not match that.
      {
        source: '/socket.io',
        destination: 'http://localhost:3001/socket.io',
      },
      {
        source: '/socket.io/:path*',
        destination: 'http://localhost:3001/socket.io/:path*',
      },
    ];
  },
};

export default nextConfig;
