import React from 'react';
import { Text, TextInput } from 'react-native';
import Renderer, { act } from 'react-test-renderer';
import { ThroughputCard } from '../src/measurements/ThroughputCard';
import NativeThroughput from '../src/specs/NativeThroughput';
import NativeQosHistory from '../src/specs/NativeQosHistory';

const native = jest.mocked(NativeThroughput!);
const history = jest.mocked(NativeQosHistory!);
const result = {
  direction: 'download',
  bytes: 1048576,
  durationMs: 1000,
  mbps: 8.388608,
  timestamp: 1,
  networkId: 'wifi-1',
};
let app: Renderer.ReactTestRenderer;
beforeEach(async () => {
  native.measure
    .mockReset()
    .mockImplementation(async (_id, _url, _bytes, direction) => ({
      ...result,
      direction,
    }));
  native.cancel.mockClear();
  history.record.mockClear();
  await act(async () => {
    app = Renderer.create(<ThroughputCard networkKey="wifi" />);
  });
  await act(async () => {
    app.root
      .findByType(TextInput)
      .props.onChangeText('http://192.168.1.2:5050');
  });
});
afterEach(async () => {
  await act(async () => {
    app.unmount();
  });
});

test('hace tres rondas secuenciales y guarda las seis transferencias completas', async () => {
  await act(async () => {
    await app.root
      .findByProps({ accessibilityLabel: 'Control de medición de velocidad' })
      .props.onPress();
  });
  expect(native.measure.mock.calls.map(call => call[3])).toEqual([
    'download',
    'upload',
    'download',
    'upload',
    'download',
    'upload',
  ]);
  expect(history.record).toHaveBeenCalledTimes(6);
  expect(new Set(history.record.mock.calls.map(call => call[0])).size).toBe(1);
});

test('cambiar la red cancela y descarta una respuesta tardía', async () => {
  let resolve!: (value: typeof result) => void;
  native.measure.mockImplementationOnce(
    () =>
      new Promise(done => {
        resolve = done;
      }),
  );
  let finished!: Promise<void>;
  await act(async () => {
    finished = app.root
      .findByProps({ accessibilityLabel: 'Control de medición de velocidad' })
      .props.onPress();
  });
  await act(async () => {
    app.update(<ThroughputCard networkKey="cellular" />);
  });
  expect(native.cancel).toHaveBeenCalledTimes(1);
  await act(async () => {
    resolve(result);
    await finished;
  });
  expect(native.measure).toHaveBeenCalledTimes(1);
  expect(history.record).not.toHaveBeenCalled();
});

test('un error no se registra como transferencia exitosa', async () => {
  native.measure.mockRejectedValueOnce(new Error('Transferencia incompleta'));
  await act(async () => {
    await app.root
      .findByProps({ accessibilityLabel: 'Control de medición de velocidad' })
      .props.onPress();
  });
  expect(history.record).not.toHaveBeenCalled();
  expect(native.measure).toHaveBeenCalledTimes(1);
  expect(
    app.root.findAllByType(Text).map(node => node.props.children),
  ).toContain('No se pudo completar la prueba');
});
