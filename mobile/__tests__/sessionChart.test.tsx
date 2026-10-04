import React from 'react';
import { Text } from 'react-native';
import Renderer, { act } from 'react-test-renderer';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { SessionChart } from '../src/history/SessionChart';
import type { HistoryRow } from '../src/history/model';

function sample(id: number, rttMs: number | null): HistoryRow {
  return {
    id,
    session: 'test',
    kind: 'latency',
    timestamp: id * 1000,
    network: 'wifi',
    data: {
      target: { host: 'echo.test', port: 5051, transport: 'udp' },
      status: rttMs === null ? 'timeout' : 'ok',
      rttMs,
      location: { status: 'waiting' },
    },
  };
}
test('sin respuestas explica el motivo en lugar de dibujar ejes vacíos', async () => {
  let app!: Renderer.ReactTestRenderer;
  await act(async () => {
    app = Renderer.create(
      <SessionChart rows={[sample(1, null), sample(2, null)]} />,
    );
  });
  expect(app.root.findAllByType(Svg)).toHaveLength(0);
  expect(
    app.root
      .findAllByType(Text)
      .some(node =>
        JSON.stringify(node.props.children).includes('Sin respuestas válidas'),
      ),
  ).toBe(true);
  await act(async () => {
    app.unmount();
  });
});
test('una pérdida separa los puntos y no inventa una línea entre ellos', async () => {
  let app!: Renderer.ReactTestRenderer;
  await act(async () => {
    app = Renderer.create(
      <SessionChart rows={[sample(1, 12), sample(2, null), sample(3, 20)]} />,
    );
  });
  expect(app.root.findAllByType(Circle)).toHaveLength(2);
  expect(
    app.root
      .findAllByType(Polyline)
      .every(node => !node.props.points.includes(' ')),
  ).toBe(true);
  await act(async () => {
    app.unmount();
  });
});
