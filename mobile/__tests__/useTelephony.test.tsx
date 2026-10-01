import React from 'react';
import {
  AppState,
  AppStateStatus,
  Linking,
  PermissionsAndroid,
} from 'react-native';
import Renderer, { act } from 'react-test-renderer';
import NativeNetworkTelephony, {
  TelephonySnapshot,
} from '../src/specs/NativeNetworkTelephony';
import { useTelephony } from '../src/telephony/useTelephony';

const moduleMock = jest.mocked(NativeNetworkTelephony!);
const empty: TelephonySnapshot = {
  status: 'permissionRequired',
  carrier: null,
  technology: null,
  signals: [],
  signalSupported: true,
  signalAgeMs: null,
  queriedAt: 0,
};
let state: ReturnType<typeof useTelephony>;
let app: Renderer.ReactTestRenderer;
let onAppState: (value: AppStateStatus) => void;
const originalAppState = AppState.currentState;

function Probe({ network = 'wifi' }: { network?: string }) {
  state = useTelephony(network);
  return null;
}

beforeEach(() => {
  jest.useFakeTimers();
  AppState.currentState = 'active';
  moduleMock.getSnapshot.mockReset().mockResolvedValue(empty);
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_event, listener) => {
      onAppState = listener;
      return { remove: jest.fn() };
    });
});

afterEach(async () => {
  await act(async () => {
    app?.unmount();
  });
  jest.restoreAllMocks();
  jest.useRealTimers();
  AppState.currentState = originalAppState;
});

test('no pide permiso al abrir y pausa consultas en segundo plano', async () => {
  const request = jest.spyOn(PermissionsAndroid, 'request');
  await act(async () => {
    app = Renderer.create(<Probe />);
  });
  expect(request).not.toHaveBeenCalled();
  expect(moduleMock.getSnapshot).toHaveBeenCalledTimes(1);
  await act(async () => {
    jest.advanceTimersByTime(5000);
  });
  expect(moduleMock.getSnapshot).toHaveBeenCalledTimes(2);
  await act(async () => {
    AppState.currentState = 'background';
    onAppState('background');
  });
  await act(async () => {
    jest.advanceTimersByTime(15000);
  });
  expect(moduleMock.getSnapshot).toHaveBeenCalledTimes(2);
  await act(async () => {
    AppState.currentState = 'active';
    onAppState('active');
  });
  expect(moduleMock.getSnapshot).toHaveBeenCalledTimes(3);
});

test('un permiso bloqueado ofrece ajustes y no repite la solicitud', async () => {
  const request = jest
    .spyOn(PermissionsAndroid, 'request')
    .mockResolvedValue(PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN);
  const settings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
  await act(async () => {
    app = Renderer.create(<Probe />);
  });
  await act(async () => {
    await state.requestPermission();
  });
  expect(state.permissionState).toBe('blocked');
  expect(state.snapshot?.status).toBe('permissionRequired');
  await act(async () => {
    await state.requestPermission();
  });
  expect(settings).toHaveBeenCalledTimes(1);
  expect(request).toHaveBeenCalledTimes(1);
});

test('no reutiliza una respuesta antigua después de cambiar de red', async () => {
  let resolveOld!: (value: TelephonySnapshot) => void;
  moduleMock.getSnapshot.mockImplementationOnce(
    () =>
      new Promise(resolve => {
        resolveOld = resolve;
      }),
  );
  await act(async () => {
    app = Renderer.create(<Probe />);
  });
  await act(async () => {
    app.update(<Probe network="cellular" />);
  });
  await act(async () => {
    resolveOld({ ...empty, status: 'ready', carrier: 'Operador anterior' });
  });
  expect(state.snapshot?.status).toBe('permissionRequired');
  expect(state.snapshot?.carrier).toBeNull();
});

test('un fallo de consulta elimina la señal anterior', async () => {
  moduleMock.getSnapshot.mockResolvedValueOnce({
    ...empty,
    status: 'ready',
    carrier: 'Operador de prueba',
  });
  await act(async () => {
    app = Renderer.create(<Probe />);
  });
  moduleMock.getSnapshot.mockRejectedValueOnce(new Error('Radio unavailable'));
  await act(async () => {
    jest.advanceTimersByTime(5000);
  });
  expect(state.snapshot).toBeNull();
  expect(state.error).toContain('No se pudo consultar');
});
