import React from 'react';
import { Text } from 'react-native';
import Renderer, { act } from 'react-test-renderer';
import App from '../App';
import NativeThroughput from '../src/specs/NativeThroughput';
import NativeQosHistory from '../src/specs/NativeQosHistory';
import { ThroughputCard } from '../src/measurements/ThroughputCard';
import { Action } from '../src/history/MonitorCard';

let app: Renderer.ReactTestRenderer;
const native = jest.mocked(NativeThroughput!);
const history = jest.mocked(NativeQosHistory!);
const response = {
  direction: 'download',
  bytes: 1048576,
  durationMs: 1000,
  mbps: 8.38,
  timestamp: 1,
  networkId: 'wifi-1',
};

async function navigate(title: string) {
  await act(async () => {
    app.root
      .findByProps({ accessibilityLabel: 'Abrir menú de secciones' })
      .props.onPress();
  });
  await act(async () => {
    app.root
      .findByProps({ accessibilityLabel: `Ir a ${title}` })
      .props.onPress();
  });
}
beforeEach(async () => {
  native.cancel.mockClear();
  native.measure
    .mockReset()
    .mockImplementation(async (_id, _url, _bytes, direction) => ({
      ...response,
      direction,
    }));
  history.query.mockClear();
  await act(async () => {
    app = Renderer.create(<App />);
  });
});
afterEach(async () => {
  await act(async () => {
    app.unmount();
  });
});

test('abre solo Inicio y conserva la URL al volver a Velocidad', async () => {
  expect(app.root.findAllByType(ThroughputCard)).toHaveLength(0);
  await navigate('Velocidad');
  await act(async () => {
    app.root
      .findByProps({ accessibilityLabel: 'URL del servidor de velocidad' })
      .props.onChangeText('http://192.168.1.2:5050');
  });
  await navigate('Inicio');
  await navigate('Velocidad');
  expect(
    app.root.findByProps({
      accessibilityLabel: 'URL del servidor de velocidad',
    }).props.value,
  ).toBe('http://192.168.1.2:5050');
});

test('navegar durante velocidad conserva la transferencia y permite volver con el aviso', async () => {
  await navigate('Velocidad');
  await act(async () => {
    app.root
      .findByProps({ accessibilityLabel: 'URL del servidor de velocidad' })
      .props.onChangeText('http://192.168.1.2:5050');
  });
  let resolve!: (value: typeof response) => void;
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
  await navigate('Historial');
  expect(native.cancel).not.toHaveBeenCalled();
  await act(async () => {
    app.root
      .findByProps({ accessibilityLabel: 'Volver a la medición en curso' })
      .props.onPress();
  });
  await act(async () => {
    resolve(response);
    await finished;
  });
  expect(native.measure).toHaveBeenCalledTimes(6);
  expect(
    app.root.findAllByProps({
      accessibilityLabel: 'Volver a la medición en curso',
    }),
  ).toHaveLength(0);
});

test('Mapa carga datos directamente y comparte los filtros escritos con Historial', async () => {
  await navigate('Mapa');
  expect(history.query).toHaveBeenCalledWith('{}');
  expect(
    app.root.findAllByType(Text).map(node => node.props.children),
  ).toContain('Mapa de mediciones');
  expect(
    app.root.findAllByProps({ accessibilityLabel: 'Fecha desde' }),
  ).toHaveLength(0);
  await act(async () => {
    app.root
      .findAllByType(Action)
      .find(node => node.props.title === 'Filtrar mediciones')!
      .props.onPress();
  });
  await act(async () => {
    app.root
      .findByProps({ accessibilityLabel: 'Fecha desde' })
      .props.onChangeText('2026-10-01');
  });
  // Escribir no aplica el filtro; se conserva incluso al pasar a otra vista.
  expect(history.query).toHaveBeenCalledTimes(1);
  await navigate('Historial');
  expect(
    app.root.findByProps({ accessibilityLabel: 'Fecha desde' }).props.value,
  ).toBe('2026-10-01');
  expect(history.query).toHaveBeenLastCalledWith('{}');
});
