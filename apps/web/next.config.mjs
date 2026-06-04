/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@proofpath/types", "@proofpath/crypto", "@proofpath/signals"],
};

export default nextConfig;
