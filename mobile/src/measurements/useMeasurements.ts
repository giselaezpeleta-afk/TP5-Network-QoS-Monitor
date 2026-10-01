import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import NativeNetworkProbe from '../specs/NativeNetworkProbe';
import { Sample, Target, validateTargets } from './statistics';

export type HostResult = { target: Target; samples: Sample[] };
type RunControl = {
  stopped: boolean;
  requestId: string | null;
  wake?: () => void;
};
export const SAMPLE_COUNT = 10;
export const TIMEOUT_MS = 2000;
const INTERVAL_MS = 250;

export function useMeasurements(networkKey: string, connected: boolean | null) {
  const [results, setResults] = useState<HostResult[]>([]);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [measuredNetwork, setMeasuredNetwork] = useState<string | null>(null);
  const run = useRef<RunControl | null>(null);
  const mounted = useRef(true);

  function cancel(
    reason = 'Medición cancelada. Se conservan los resultados parciales.',
  ) {
    const control = run.current;
    if (!control || control.stopped) {
      return;
    }
    control.stopped = true;
    if (control.requestId) {
      NativeNetworkProbe?.cancel(control.requestId);
    }
    control.wake?.();
    if (mounted.current) {
      setMessage(reason);
    }
  }

  useEffect(() => {
    mounted.current = true;
    const listener = AppState.addEventListener('change', state => {
      if (state !== 'active') {
        cancel('Medición detenida al salir de la app. Resultados parciales.');
      }
    });
    return () => {
      mounted.current = false;
      cancel();
      listener.remove();
    };
  }, []);

  useEffect(() => {
    cancel('La conexión cambió. Iniciá otra medición para comparar redes.');
  }, [networkKey, connected]);

  async function start(targets: Target[]) {
    if (run.current) {
      return;
    }
    const validation = validateTargets(targets);
    if (validation || connected === false || !NativeNetworkProbe) {
      setMessage(
        validation ??
          (connected === false
            ? 'Conectá el teléfono a una red antes de medir.'
            : 'Instalá el APK actualizado para habilitar las sondas.'),
      );
      return;
    }
    const control: RunControl = { stopped: false, requestId: null };
    run.current = control;
    setRunning(true);
    setMessage(null);
    setMeasuredNetwork(networkKey.split('|')[0]);
    const collected = targets.map(target => ({
      target: { ...target },
      samples: [] as Sample[],
    }));
    setResults(collected.map(entry => ({ ...entry, samples: [] })));
    let nativeNetwork: string | null = null;
    try {
      for (
        let hostIndex = 0;
        hostIndex < collected.length && !control.stopped;
        hostIndex++
      ) {
        const entry = collected[hostIndex];
        for (
          let sequence = 1;
          sequence <= SAMPLE_COUNT && !control.stopped;
          sequence++
        ) {
          control.requestId = `${Date.now()}-${hostIndex}-${sequence}`;
          const result = await NativeNetworkProbe.probe(
            control.requestId,
            entry.target.host.trim(),
            entry.target.port,
            entry.target.transport,
            TIMEOUT_MS,
          );
          control.requestId = null;
          if (control.stopped || !mounted.current) {
            break;
          }
          if (
            result.status === 'networkChanged' ||
            result.status === 'cancelled' ||
            (nativeNetwork !== null && nativeNetwork !== result.networkId)
          ) {
            cancel(
              'La sonda se interrumpió. Resultados parciales; iniciá otra medición.',
            );
            break;
          }
          nativeNetwork = result.networkId;
          entry.samples.push({ ...result, sequence, timestamp: Date.now() });
          setResults(
            collected.map(item => ({ ...item, samples: [...item.samples] })),
          );
          // No se envía otra sonda hasta cerrar la anterior. Cancelar despierta
          // también esta pausa, sin dejar un temporizador pendiente en background.
          if (sequence < SAMPLE_COUNT && !control.stopped) {
            await new Promise<void>(resolve => {
              const timer = setTimeout(() => {
                control.wake = undefined;
                resolve();
              }, INTERVAL_MS);
              control.wake = () => {
                clearTimeout(timer);
                control.wake = undefined;
                resolve();
              };
            });
          }
        }
      }
      if (!control.stopped && mounted.current) {
        setMessage(
          'Medición terminada. Los resultados se conservan en esta pantalla hasta iniciar otra o cerrar la app.',
        );
      }
    } catch {
      if (!control.stopped && mounted.current) {
        setMessage(
          'No se pudo completar la medición. Podés reintentar; se conservaron los resultados parciales.',
        );
      }
    } finally {
      run.current = null;
      if (mounted.current) {
        setRunning(false);
      }
    }
  }

  return { start, cancel, results, running, message, measuredNetwork };
}
