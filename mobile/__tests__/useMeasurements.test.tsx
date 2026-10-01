import React from 'react';
import { AppState, AppStateStatus } from 'react-native';
import Renderer, { act } from 'react-test-renderer';
import NativeNetworkProbe, {
  ProbeResult,
} from '../src/specs/NativeNetworkProbe';
import { useMeasurements } from '../src/measurements/useMeasurements';

const native = jest.mocked(NativeNetworkProbe!);
const targets = ['1.1.1.1', '8.8.8.8', '9.9.9.9'].map(host => ({
  host,
  port: 53,
  transport: 'tcp' as const,
}));
const response: ProbeResult = {
  status: 'ok',
  rttMs: 15,
  sent: false,
  address: '1.1.1.1',
  networkId: '1',
};
let state: ReturnType<typeof useMeasurements>;
let app: Renderer.ReactTestRenderer;
let appStateChanged: (value: AppStateStatus) => void;
function Harness({ network = 'wifi' }: { network?: string }) {
  state = useMeasurements(network, true);
  return null;
}

beforeEach(async () => {
  jest.useFakeTimers();
  native.probe.mockReset().mockResolvedValue(response);
  native.cancel.mockReset();
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_event, listener) => {
      appStateChanged = listener;
      return { remove: jest.fn() };
    });
  await act(async () => {
    app = Renderer.create(<Harness />);
  });
});
afterEach(async () => {
  await act(async () => {
    app.unmount();
  });
  jest.restoreAllMocks();
  jest.useRealTimers();
});

test('ejecuta 10 sondas por host y evita iniciar dos series simultáneas', async () => {
  let finished!: Promise<void>;
  await act(async () => {
    finished = state.start(targets);
    await state.start(targets);
  });
  await act(async () => {
    await jest.runAllTimersAsync();
    await finished;
  });
  expect(native.probe).toHaveBeenCalledTimes(30);
  expect(state.results.map(result => result.samples.length)).toEqual([
    10, 10, 10,
  ]);
  expect(state.running).toBe(false);
  expect(state.message).toContain('terminada');
});

test('al cambiar de red cancela y descarta una respuesta tardía', async () => {
  let resolve!: (value: ProbeResult) => void;
  native.probe.mockImplementationOnce(
    () =>
      new Promise(done => {
        resolve = done;
      }),
  );
  let finished!: Promise<void>;
  await act(async () => {
    finished = state.start(targets);
  });
  await act(async () => {
    app.update(<Harness network="cellular" />);
  });
  expect(native.cancel).toHaveBeenCalledTimes(1);
  await act(async () => {
    resolve(response);
    await finished;
  });
  expect(state.results[0].samples).toHaveLength(0);
  expect(native.probe).toHaveBeenCalledTimes(1);
  expect(state.running).toBe(false);
});

test('pasar a background interrumpe la pausa y conserva solo las sondas terminadas', async () => {
  let finished!: Promise<void>;
  await act(async () => {
    finished = state.start(targets);
  });
  await act(async () => {
    appStateChanged('background');
    await finished;
  });
  expect(state.results[0].samples).toHaveLength(1);
  expect(native.probe).toHaveBeenCalledTimes(1);
  // React también programa tareas: verificamos que ninguna dispare otra sonda.
  await act(async () => {
    await jest.runAllTimersAsync();
  });
  expect(native.probe).toHaveBeenCalledTimes(1);
  expect(state.running).toBe(false);
});

test('detecta otra red nativa aunque NetInfo siga informando Wi-Fi', async () => {
  native.probe
    .mockResolvedValueOnce(response)
    .mockResolvedValueOnce({ ...response, networkId: '2' });
  let finished!: Promise<void>;
  await act(async () => {
    finished = state.start(targets);
  });
  await act(async () => {
    await jest.runAllTimersAsync();
    await finished;
  });
  expect(state.results[0].samples).toHaveLength(1);
  expect(native.probe).toHaveBeenCalledTimes(2);
  expect(state.message).toContain('interrumpió');
});
