/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { dev }) => {
    if (dev) {
      // Éviter que le dossier tests/ déclenche un Fast Refresh pendant les tests Playwright.
      // On utilise des RegExp pour que ça fonctionne sur Windows (chemins avec backslashes).
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          /[/\\]node_modules[/\\]/,
          /[/\\]\.next[/\\]/,
          /[/\\]tests[/\\]/,
        ],
      }
    }
    return config
  },
}

module.exports = nextConfig
