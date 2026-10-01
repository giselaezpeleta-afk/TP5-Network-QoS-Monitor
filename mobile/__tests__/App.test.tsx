import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import NetInfo, {
  useNetInfo,
  NetInfoStateType,
} from '@react-native-community/netinfo';
import App from '../App';

test('permite reintentar cuando falla la actualización de red', async () => {
  let app!: ReactTestRenderer.ReactTestRenderer;
  jest.mocked(NetInfo.refresh).mockRejectedValueOnce(new Error('Native error'));
  await act(async () => {
    app = ReactTestRenderer.create(<App />);
  });
  await act(async () => {
    await app.root
      .findAllByProps({ accessibilityRole: 'button' })[0]
      .props.onPress();
  });
  expect(
    app.root.findAllByProps({ accessibilityRole: 'alert' })[0].props.children,
  ).toContain('Volvé a intentar');
  expect(
    app.root.findAllByProps({ accessibilityRole: 'button' })[0].props
      .accessibilityState.disabled,
  ).toBe(false);
  await act(async () => {
    app.unmount();
  });
});

test('actualiza la pantalla cuando cambia el estado de la conexión', async () => {
  let app!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    app = ReactTestRenderer.create(<App />);
  });
  jest.mocked(useNetInfo).mockReturnValueOnce({
    type: NetInfoStateType.none,
    isConnected: false,
    isInternetReachable: false,
    details: null,
  });
  await act(async () => {
    app.update(<App />);
  });
  const texts = app.root.findAllByType(Text).map(node => node.props.children);
  expect(texts).toContain('Sin conexión');
  expect(texts).not.toContain('Conexión activa');
  await act(async () => {
    app.unmount();
  });
});
