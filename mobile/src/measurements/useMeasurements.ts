import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import NativeNetworkProbe from '../specs/NativeNetworkProbe';
import NativeQosHistory from '../specs/NativeQosHistory';
import { Sample, Target, validateTargets } from './statistics';
import {
  acquireMeasurement,
  ensureMonitorStopped,
  recordSample,
  releaseMeasurement,
} from '../history/model';

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
    if (!acquireMeasurement('latency')) {
      setMessage('Ya hay otra medición activa. Esperá a que termine.');
      return;
    }
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
    const session = `latency-${Date.now()}`;
    try {
      await ensureMonitorStopped();
      if (NativeQosHistory) {
        const settings = JSON.parse(await NativeQosHistory.getSettings());
        await NativeQosHistory.saveSettings(
          JSON.stringify({ ...settings, targets }),
        );
      }
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
          const sample = { ...result, sequence, timestamp: Date.now() };
          entry.samples.push(sample);
          await recordSample(session, 'latency', sample.timestamp, {
            ...sample,
            target: entry.target,
            source: 'foreground',
          });
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
          'Medición terminada y guardada en el historial del teléfono.',
        );
      }
    } catch (error) {
      if (!control.stopped && mounted.current) {
        setMessage(
          error instanceof Error
            ? error.message
            : 'No se pudo completar o guardar la medición. Resultados parciales en pantalla.',
        );
      }
    } finally {
      run.current = null;
      releaseMeasurement('latency');
      if (mounted.current) {
        setRunning(false);
      }
    }
  }

  return { start, cancel, results, running, message, measuredNetwork };
}
