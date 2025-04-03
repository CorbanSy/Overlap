const { withNativeWind } = require('nativewind/metro');
const { getDefaultConfig } = require('expo/metro-config');

// Generate the default config for Expo
const config = getDefaultConfig(__dirname, { isCSSEnabled: true });

// 1. Point the transformer to react-native-svg-transformer
config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');

// 2. Remove "svg" from assetExts and include it in sourceExts
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'svg');
config.resolver.sourceExts.push('svg');

// 3. Apply NativeWind
module.exports = withNativeWind(config, { input: './global.css' });
