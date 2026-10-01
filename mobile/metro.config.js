const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
// Limita procesos de transformacion para cuidar la memoria de la PC.
const config = { maxWorkers: 1 };

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
