import {
  NetInfoState,
  NetInfoStateType,
} from '@react-native-community/netinfo';
import { connectionSummary } from '../src/network/connectionSummary';

const wifi: NetInfoState = {
  type: NetInfoStateType.wifi,
  isConnected: true,
  isInternetReachable: true,
  details: {
    isConnectionExpensive: false,
    ssid: null,
    bssid: null,
    strength: null,
    ipAddress: null,
    subnet: null,
    frequency: null,
    linkSpeed: null,
    rxLinkSpeed: null,
    txLinkSpeed: null,
  },
};

test('una red Wi-Fi sin Internet no se presenta como acceso disponible', () => {
  const summary = connectionSummary({ ...wifi, isInternetReachable: false });
  expect(summary.network).toBe('Wi-Fi');
  expect(summary.status).toBe('Red sin Internet');
  expect(summary.internet).toBe('No disponible');
});

test('un dato pendiente no se interpreta como desconexión', () => {
  expect(
    connectionSummary({ ...wifi, isInternetReachable: null }).internet,
  ).toBe('Por verificar');
  expect(
    connectionSummary({
      type: NetInfoStateType.unknown,
      isConnected: null,
      isInternetReachable: null,
      details: null,
    }).status,
  ).toBe('Detectando conexión');
});

test('los datos celulares faltantes no se inventan', () => {
  const summary = connectionSummary({
    type: NetInfoStateType.cellular,
    isConnected: true,
    isInternetReachable: true,
    details: {
      cellularGeneration: null,
      carrier: '  ',
      isConnectionExpensive: true,
    },
  });
  expect(summary.carrier).toBe('No disponible');
  expect(summary.generation).toBe('No disponible');
  expect(connectionSummary(wifi).carrier).toBeNull();
});

test('una red desconectada no conserva un estado positivo de Internet', () => {
  const summary = connectionSummary({ ...wifi, isConnected: false });
  expect(summary.status).toBe('Sin conexión');
  expect(summary.internet).toBe('Sin conexión');
});
