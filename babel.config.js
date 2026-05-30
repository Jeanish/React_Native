module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    ['module:react-native-dotenv', {
      moduleName: '@env',
      path: '.env',
    }],
    // react-native-reanimated MUST be last
    'react-native-reanimated/plugin',
  ],
};
