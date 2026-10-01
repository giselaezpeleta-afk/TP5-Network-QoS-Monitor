import {
  NetInfoState,
  NetInfoStateType,
} from '@react-native-community/netinfo';

const networkNames: Record<NetInfoStateType, string> = {
  unknown: 'Por determinar',
  none: 'Sin red',
  wifi: 'Wi-Fi',
  cellular: 'Datos móviles',
  bluetooth: 'Bluetooth',
  ethernet: 'Ethernet',
  wimax: 'WiMAX',
  vpn: 'VPN',
  other: 'Otra conexión',
};

export function connectionSummary(state: NetInfoState) {
  // null significa que Android todavía no tiene el dato: no equivale a false.
  const disconnected = state.isConnected === false || state.type === 'none';
  const connected = !disconnected && state.isConnected === true;
  const noInternet = connected && state.isInternetReachable === false;
  const internet = disconnected
    ? 'Sin conexión'
    : state.isInternetReachable === null
    ? 'Por verificar'
    : state.isInternetReachable
    ? 'Disponible'
    : 'No disponible';

  const tone: 'warning' | 'positive' | 'neutral' =
    disconnected || noInternet ? 'warning' : connected ? 'positive' : 'neutral';

  return {
    network: networkNames[state.type],
    status: disconnected
      ? 'Sin conexión'
      : noInternet
      ? 'Red sin Internet'
      : connected
      ? 'Conexión activa'
      : 'Detectando conexión',
    tone,
    internet,
    // Los detalles celulares describen la red activa, no una SIM en segundo plano.
    generation:
      state.type === 'cellular'
        ? state.details.cellularGeneration?.toUpperCase() ?? 'No disponible'
        : null,
    carrier:
      state.type === 'cellular'
        ? state.details.carrier?.trim() || 'No disponible'
        : null,
    metered:
      state.details?.isConnectionExpensive === undefined
        ? 'No disponible'
        : state.details.isConnectionExpensive
        ? 'Limitada o de mayor costo'
        : 'No marcada como limitada',
  };
}
