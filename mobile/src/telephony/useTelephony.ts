import { useEffect, useState } from 'react';
import { AppState, Linking, PermissionsAndroid } from 'react-native';
import NativeNetworkTelephony, {
  TelephonySnapshot,
} from '../specs/NativeNetworkTelephony';

export function useTelephony(networkType: string) {
  const [snapshot, setSnapshot] = useState<TelephonySnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<
    'denied' | 'blocked' | null
  >(null);
  const [requesting, setRequesting] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    let busy = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    setSnapshot(null);

    async function read() {
      if (!active || busy || AppState.currentState !== 'active') return;
      if (!NativeNetworkTelephony) {
        setError(
          'Esta instalación necesita actualizarse para consultar la señal.',
        );
        return;
      }
      busy = true;
      try {
        const next = await NativeNetworkTelephony.getSnapshot();
        if (active) {
          setSnapshot(next);
          setError(null);
        }
      } catch {
        // No conservamos una lectura anterior como si siguiera siendo actual.
        if (active) {
          setSnapshot(null);
          setError('No se pudo consultar la señal. Volvé a actualizar.');
        }
      } finally {
        busy = false;
      }
    }

    function stop() {
      if (timer) {
        clearInterval(timer);
        timer = undefined;
      }
    }
    function start() {
      stop();
      read();
      timer = setInterval(() => {
        read();
      }, 5000);
    }
    if (AppState.currentState === 'active') start();
    // Solo se consulta en primer plano. El muestreo en background será otra etapa.
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') start();
      else stop();
    });
    return () => {
      active = false;
      stop();
      listener.remove();
    };
  }, [networkType, revision]);

  async function requestPermission() {
    if (requesting) return;
    setRequesting(true);
    try {
      if (permissionState === 'blocked') {
        await Linking.openSettings();
        return;
      }
      // La solicitud se dispara solo al tocar el botón, nunca al abrir la app.
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
      );
      if (result === PermissionsAndroid.RESULTS.GRANTED)
        setPermissionState(null);
      else if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN)
        setPermissionState('blocked');
      else setPermissionState('denied');
      setRevision(value => value + 1);
    } catch {
      setError('No se pudo abrir la solicitud de permiso. Volvé a intentar.');
    } finally {
      setRequesting(false);
    }
  }

  return {
    snapshot,
    error,
    requesting,
    permissionState,
    requestPermission,
    refresh: () => setRevision(value => value + 1),
  };
}
