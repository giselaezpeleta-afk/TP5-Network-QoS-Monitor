/* eslint-env jest */
jest.mock('./src/specs/NativeNetworkProbe', () => ({
  __esModule: true,
  default: { probe: jest.fn(), cancel: jest.fn() },
}));
jest.mock('./src/specs/NativeNetworkTelephony', () => ({
  __esModule: true,
  default: {
    getSnapshot: jest.fn().mockResolvedValue({
      status: 'permissionRequired',
      carrier: null,
      technology: null,
      signals: [],
      signalSupported: true,
      signalAgeMs: null,
      queriedAt: 0,
    }),
  },
}));
// Android entrega los datos reales; Jest usa este doble para probar los estados.
jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock'),
);

// Jest no recibe los márgenes de las barras de Android: usamos el mock oficial.
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);
