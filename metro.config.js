module.exports = {
  resolver: {
    sourceExts: ['jsx', 'js', 'ts', 'tsx'], //add here
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};
