module.exports = {
  root: true,
  extends: '@react-native',
  // Gradle genera reportes JS ajenos al código de la aplicación.
  ignorePatterns: ['android/**/build/**', 'android/.gradle/**'],
};
