import type { ProbeResult } from '../specs/NativeNetworkProbe';

export type Transport = 'tcp' | 'udp';
export type Target = { host: string; port: number; transport: Transport };
export type Sample = ProbeResult & { sequence: number; timestamp: number };

// Jitter de RTT: media de diferencias absolutas entre respuestas consecutivas.
// Un fallo corta el par: no inventamos un RTT ni un salto a través de la pérdida.
export function summarize(samples: Sample[], transport: Transport) {
  const values: number[] = [];
  const differences: number[] = [];
  let previous: number | null = null;
  for (const sample of samples) {
    if (sample.status === 'ok' && sample.rttMs !== null) {
      values.push(sample.rttMs);
      if (previous !== null) {
        differences.push(Math.abs(sample.rttMs - previous));
      }
      previous = sample.rttMs;
    } else {
      previous = null;
    }
  }
  const attempts = samples.filter(
    s => !['cancelled', 'networkChanged'].includes(s.status),
  );
  const sent = attempts.filter(s => s.sent).length;
  const missing = attempts.filter(s => s.sent && s.status === 'timeout').length;
  // UDP mide ausencia de eco dentro del plazo, no permite localizar la pérdida
  // en ida/vuelta ni distinguirla de un servidor apagado o un filtro de red.
  const invalidUdp = attempts.some(
    s => s.status !== 'ok' && s.status !== 'timeout',
  );
  return {
    minimum: values.length ? Math.min(...values) : null,
    average: values.length
      ? values.reduce((a, b) => a + b, 0) / values.length
      : null,
    maximum: values.length ? Math.max(...values) : null,
    jitter: differences.length
      ? differences.reduce((a, b) => a + b, 0) / differences.length
      : null,
    received: values.length,
    attempts: attempts.length,
    failed: attempts.length - values.length,
    sent,
    missing,
    lossPercent:
      transport === 'udp' && sent > 0 && !invalidUdp
        ? (missing / sent) * 100
        : null,
  };
}

export function validateTargets(targets: Target[]): string | null {
  if (targets.length < 3) {
    return 'Configurá al menos tres destinos.';
  }
  for (const [index, target] of targets.entries()) {
    if (!target.host.trim() || /[\s/]/.test(target.host.trim())) {
      return `Destino ${
        index + 1
      }: ingresá una IP o dominio, sin http:// ni rutas.`;
    }
    if (
      !Number.isInteger(target.port) ||
      target.port < 1 ||
      target.port > 65535
    ) {
      return `Destino ${index + 1}: el puerto debe estar entre 1 y 65535.`;
    }
  }
  if (new Set(targets.map(t => t.host.trim().toLowerCase())).size < 3) {
    return 'Usá tres hosts distintos para poder comparar destinos.';
  }
  return null;
}
