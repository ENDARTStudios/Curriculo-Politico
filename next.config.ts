import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.camara.leg.br" },
      { protocol: "https", hostname: "dadosabertos.camara.leg.br" },
      { protocol: "https", hostname: "www.senado.leg.br" },
      { protocol: "http", hostname: "www.senado.leg.br" },
    ],
  },
};

export default nextConfig;
