module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module-resolver', {
        alias: {
          '@vampir-koylu/shared': '../shared/src/index.ts',
        },
      }],
    ],
  };
};
