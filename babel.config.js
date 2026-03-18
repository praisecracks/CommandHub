module.exports = function (api) {
  api.cache(true);
  let plugins = [];

  // IMPORTANT: react-native-reanimated v4+ requires the reanimated plugin
  // The worklets plugin is automatically included by the reanimated plugin
  plugins.push('react-native-reanimated/plugin');
  
  // Add dotenv support for environment variables
  plugins.push([
    'module:react-native-dotenv',
    {
      moduleName: '@env',
      path: '.env',
      blacklist: null,
      whitelist: null,
      safe: false,
      allowUndefined: true,
    },
  ]);

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};