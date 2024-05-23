module.exports = {
  webpack: {
    configure: {
      experiments: {
        topLevelAwait: true,
      },
      externals: {
        'node:fs/promises': '{}'
      }
    },
  },
};
