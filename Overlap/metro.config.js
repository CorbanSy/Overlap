// metro.config.js
const { withNativeWind } = require('nativewind/metro');
const { getDefaultConfig } = require('expo/metro-config');

// 1. Generate default Expo config (with CSS enabled for NativeWind)
const config = getDefaultConfig(__dirname, { isCSSEnabled: true });

// 2. SVG transformer setup
config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'svg');
config.resolver.sourceExts.push('svg');

// 3. Enable .cjs resolution so Firebase’s internal cjs modules are picked up
config.resolver.sourceExts.push('cjs');

// 4. Turn off the strict package‑exports enforcement (fixes the “Component auth has not been registered”)
config.resolver.unstable_enablePackageExports = false;

// 5. Wrap with NativeWind
module.exports = withNativeWind(config, { input: './global.css' });
