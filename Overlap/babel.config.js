console.log('>>> Using Overlap/babel.config.js');

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'expo-router/babel',                 // needed for app/ routing
      'react-native-css-interop/babel',    // NativeWind v4 (css-interop)
      'react-native-reanimated/plugin',    // MUST be last
    ],
  };
};
