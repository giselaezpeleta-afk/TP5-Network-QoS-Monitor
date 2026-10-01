import NativeQosHistory from '../specs/NativeQosHistory';
import type { Target } from '../measurements/statistics';

export type Settings = {
  intervalSeconds: number;
  rttThreshold: number;
  jitterThreshold: number;
  failureThreshold: number;
  targets: Target[];
};
export const defaults: Settings = {
  intervalSeconds: 60,
  rttThreshold: 500,
  jitterThreshold: 100,
  failureThreshold: 50,
  targets: ['1.1.1.1', '8.8.8.8', '9.9.9.9'].map(host => ({
    host,
    port: 53,
    transport: 'tcp',
  })),
};
export type HistoryRow = {
  id: number;
  session: string;
  kind: 'latency' | 'throughput';
  timestamp: number;
  network: string;
  data: {
    target?: Target;
    sequence?: number;
    source?: string;
    status?: string;
    rttMs?: number | null;
    direction?: string;
    mbps?: number;
    bytes?: number;
    durationMs?: number;
    location: {
      status: string;
      latitude?: number;
      longitude?: number;
      accuracyM?: number;
      timestamp?: number;
      ageMs?: number;
    };
  };
};
export async function recordSample(
  session: string,
  kind: 'latency' | 'throughput',
  timestamp: number,
  data: unknown,
) {
  if (NativeQosHistory) {
    await NativeQosHistory.record(
      session,
      kind,
      timestamp,
      JSON.stringify(data),
    );
  }
}

// Un bloqueo compartido impide contaminar el test manual de velocidad con sondas.
let measurementOwner: string | null = null;
export function acquireMeasurement(owner: string) {
  if (measurementOwner !== null) {
    return false;
  }
  measurementOwner = owner;
  return true;
}
export function releaseMeasurement(owner: string) {
  if (measurementOwner === owner) {
    measurementOwner = null;
  }
}
export async function ensureMonitorStopped() {
  const status = await NativeQosHistory?.monitoringStatus();
  if (status === 'Activo' || status === 'Iniciando…') {
    throw new Error(
      'Detené el monitoreo periódico antes de iniciar una prueba manual.',
    );
  }
}
