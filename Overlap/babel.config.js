module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "@babel/preset-react",
      "nativewind/babel",
    ],
    plugins: [
      "react-native-reanimated/plugin", // Must be LAST in the plugin list
    ],
  };
};
