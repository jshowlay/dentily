/** @type {import('next').NextConfig} */
const nextConfig = {
  // @react-pdf/renderer pulls in Node-oriented deps; let Next load it externally
  // (server-side only) instead of bundling it, which avoids build/runtime errors.
  experimental: {
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
  },
  async redirects() {
    return [{ source: "/home", destination: "/", permanent: true }];
  },
};

export default nextConfig;
