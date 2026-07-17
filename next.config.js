/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ces modules ne servent que côté serveur (undici pour le dispatcher sans
  // timeout, better-sqlite3 pour la persistance). Ils importent des modules
  // natifs Node (`node:assert`, `node:async_hooks`) que webpack ne sait pas
  // empaqueter pour le navigateur. On les neutralise dans le bundle client :
  // les chemins de code qui les utilisent sont déjà gardés par `typeof window`
  // ou n'existent que dans getServerSideProps / les routes API.
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        undici: false,
        'better-sqlite3': false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
