// Webovou verzi lze nasadit do podsložky (např. GitHub Pages): EXPO_BASE_URL=/Repo/slozka
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}),
  },
});
