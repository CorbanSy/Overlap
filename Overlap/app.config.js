// app.config.js
export default {
  expo: {
    name: "Overlap",
    slug: "overlap",
    scheme: "overlap",
    userInterfaceStyle: "automatic",
    android: {
      package: "com.anonymous.Overlap",
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      // (optional) but safe: request minSdk 24 which RN 0.76 expects
      // minSdkVersion: 24,
    },
    ios: { supportsTablet: true },
    plugins: [
      "expo-dev-client",
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
        },
      ],
      // >>> ADD THIS <<<
      ["expo-build-properties", { android: { kotlinVersion: "2.0.20" } }],
    ],
  },
};
