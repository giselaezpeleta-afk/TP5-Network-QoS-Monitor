import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Action, MonitorCard } from '../src/history/MonitorCard';
import NativeQosHistory from '../src/specs/NativeQosHistory';

const native = jest.mocked(NativeQosHistory!);
test('refleja el servicio activo y confirma la detención antes de permitir otro inicio', async () => {
  jest.useFakeTimers();
  let status = 'Activo';
  native.monitoringStatus.mockImplementation(async () => status);
  native.stopMonitoring.mockImplementation(async () => {
    status = 'Detenido';
  });
  let app!: Renderer.ReactTestRenderer;
  try {
    await act(async () => {
      app = Renderer.create(<MonitorCard />);
    });
    const action = (title: string) =>
      app.root.findAllByType(Action).find(node => node.props.title === title)!;
    expect(action('Monitoreo iniciado').props.disabled).toBe(true);
    expect(action('Detener monitoreo').props.disabled).toBe(false);
    await act(async () => {
      await action('Detener monitoreo').props.onPress();
    });
    expect(action('Deteniendo monitoreo…').props.disabled).toBe(true);
    await act(async () => {
      await jest.advanceTimersByTimeAsync(2000);
    });
    expect(action('Iniciar monitoreo periódico').props.disabled).toBe(false);
    expect(action('Detener monitoreo').props.disabled).toBe(true);
  } finally {
    await act(async () => {
      app?.unmount();
    });
    native.monitoringStatus.mockResolvedValue('Detenido');
    native.stopMonitoring.mockResolvedValue(undefined);
    jest.useRealTimers();
  }
});
