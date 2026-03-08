/** @type {import('next').NextConfig} */
const nextConfig = {
    // Server-only packages should not be bundled for client/edge
    experimental: {
        serverComponentsExternalPackages: ["mongoose", "bcryptjs"],
    },
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "**",
            },
        ],
    },
};

export default nextConfig;
