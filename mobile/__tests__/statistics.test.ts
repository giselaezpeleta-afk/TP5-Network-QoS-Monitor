import {
  Sample,
  summarize,
  validateTargets,
} from '../src/measurements/statistics';

const sample = (
  rtt: number | null,
  status = rtt === null ? 'timeout' : 'ok',
): Sample => ({
  rttMs: rtt,
  status,
  sent: true,
  address: '127.0.0.1',
  networkId: '1',
  sequence: 1,
  timestamp: 0,
});

test('calcula RTT y jitter sin incluir timeouts ni unir pares a través de una pérdida', () => {
  const result = summarize(
    [sample(10), sample(20), sample(null), sample(90), sample(100)],
    'udp',
  );
  expect(result).toMatchObject({
    minimum: 10,
    average: 55,
    maximum: 100,
    jitter: 10,
    received: 4,
    lossPercent: 20,
  });
});

test('sin respuestas o sin pares el valor es desconocido, no cero', () => {
  expect(summarize([], 'tcp')).toMatchObject({
    average: null,
    jitter: null,
    lossPercent: null,
  });
  expect(summarize([sample(null), sample(null)], 'udp')).toMatchObject({
    average: null,
    jitter: null,
    lossPercent: 100,
  });
  expect(summarize([sample(3)], 'udp').jitter).toBeNull();
  expect(summarize([sample(3), sample(3)], 'udp').jitter).toBe(0);
});

test('TCP fallido no se presenta como pérdida de paquetes', () => {
  expect(summarize([sample(10), sample(null)], 'tcp')).toMatchObject({
    failed: 1,
    attempts: 2,
    lossPercent: null,
  });
});

test('cancelaciones no cuentan y los errores locales invalidan la estimación UDP', () => {
  expect(
    summarize([sample(10), sample(null, 'cancelled')], 'udp'),
  ).toMatchObject({ attempts: 1, lossPercent: 0 });
  expect(
    summarize(
      [sample(10), { ...sample(null, 'dnsError'), sent: false }],
      'udp',
    ),
  ).toMatchObject({ sent: 1, lossPercent: null });
});

test('valida tres hosts distintos y puertos configurables', () => {
  const targets = ['1.1.1.1', '8.8.8.8', '9.9.9.9'].map(host => ({
    host,
    port: 53,
    transport: 'tcp' as const,
  }));
  expect(validateTargets(targets)).toBeNull();
  expect(validateTargets(targets.slice(0, 2))).not.toBeNull();
  expect(validateTargets([targets[0], targets[0], targets[0]])).not.toBeNull();
  expect(
    validateTargets([{ ...targets[0], port: 65536 }, ...targets.slice(1)]),
  ).not.toBeNull();
  expect(
    validateTargets([
      { ...targets[0], host: 'https://example.com/' },
      ...targets.slice(1),
    ]),
  ).not.toBeNull();
});
