// app.config.js
export default {
  expo: {
    name: "Overlap",
    slug: "overlap",
    scheme: "overlap",
    userInterfaceStyle: "automatic",
    assetBundlePatterns: [
      "assets/**/*"
    ],
    android: {
      package: "com.anonymous.Overlap",
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
    },
    ios: { supportsTablet: true },
    plugins: [
      "expo-dev-client",
      "expo-router",
      [
        "expo-splash-screen",
        { image: "./assets/images/splash.png", imageWidth: 200, resizeMode: "contain", backgroundColor: "#ffffff" }
      ],
      ['expo-build-properties', { android: { kotlinVersion: '1.9.24' } }],
    ],
  },
};