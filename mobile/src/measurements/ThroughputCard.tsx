import React, { useEffect, useRef, useState } from 'react';
import {
  AppState,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import NativeThroughput, { TransferResult } from '../specs/NativeThroughput';
import NativeQosHistory from '../specs/NativeQosHistory';
import { colors } from '../theme';
import {
  acquireMeasurement,
  ensureMonitorStopped,
  recordSample,
  releaseMeasurement,
} from '../history/model';

export function ThroughputCard({ networkKey }: { networkKey: string }) {
  const [url, setUrl] = useState('');
  const [mib, setMib] = useState(1);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TransferResult[]>([]);
  const [message, setMessage] = useState(
    'Configurá la dirección del servidor propio.',
  );
  const active = useRef<{ id: string; stopped: boolean } | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    NativeQosHistory?.getSettings()
      .then(value => {
        const settings = JSON.parse(value);
        if (mounted.current && settings.serverUrl) setUrl(settings.serverUrl);
      })
      .catch(() => {});
  }, []);

  function cancel(
    reason = 'Prueba cancelada. Se conservan las transferencias completas.',
  ) {
    const control = active.current;
    if (!control || control.stopped) {
      return;
    }
    control.stopped = true;
    NativeThroughput?.cancel(control.id);
    if (mounted.current) {
      setMessage(reason);
    }
  }
  useEffect(() => {
    mounted.current = true;
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') {
        cancel('Prueba detenida al salir de la app.');
      }
    });
    return () => {
      mounted.current = false;
      cancel();
      subscription.remove();
    };
  }, []);
  useEffect(() => {
    cancel('La conexión cambió. Iniciá otra prueba.');
  }, [networkKey]);

  async function start() {
    if (active.current) {
      return;
    }
    if (!NativeThroughput || !url.trim()) {
      setMessage('Ingresá la URL del servidor e instalá el APK actualizado.');
      return;
    }
    const control = { id: '', stopped: false };
    if (!acquireMeasurement('throughput')) {
      setMessage('Ya hay otra medición activa. Esperá a que termine.');
      return;
    }
    active.current = control;
    setRunning(true);
    setResults([]);
    let networkId: string | null = null;
    const session = `throughput-${Date.now()}`;
    try {
      await ensureMonitorStopped();
      if (NativeQosHistory) {
        const settings = JSON.parse(await NativeQosHistory.getSettings());
        await NativeQosHistory.saveSettings(
          JSON.stringify({ ...settings, serverUrl: url.trim() }),
        );
      }
      for (let round = 1; round <= 3 && !control.stopped; round++) {
        for (const direction of ['download', 'upload']) {
          if (control.stopped) {
            break;
          }
          control.id = `speed-${Date.now()}-${round}-${direction}`;
          setMessage(
            `Ronda ${round}/3 · ${
              direction === 'download' ? 'descarga' : 'subida'
            }…`,
          );
          const result = await NativeThroughput.measure(
            control.id,
            url.trim(),
            mib * 1048576,
            direction,
          );
          if (control.stopped || !mounted.current) {
            break;
          }
          if (networkId !== null && result.networkId !== networkId) {
            cancel('La red cambió entre transferencias. Resultados parciales.');
            break;
          }
          networkId = result.networkId;
          setResults(current => [...current, result]);
          await recordSample(session, 'throughput', result.timestamp, {
            ...result,
            source: 'foreground',
          });
        }
      }
      if (!control.stopped && mounted.current) {
        setMessage('Tres rondas terminadas.');
      }
    } catch (error) {
      if (!control.stopped && mounted.current) {
        setMessage(
          error instanceof Error
            ? error.message
            : 'Falló la transferencia. Revisá servidor y conexión.',
        );
      }
    } finally {
      active.current = null;
      releaseMeasurement('throughput');
      if (mounted.current) {
        setRunning(false);
      }
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title} accessibilityRole="header">
        Medir velocidad
      </Text>
      <Text style={styles.note}>
        Tres rondas contra tu servidor. Consumo aproximado: {mib * 9} MiB,
        incluido el eco de subida. Evitá ejecutar latencia u otras descargas a
        la vez.
      </Text>
      <TextInput
        accessibilityLabel="URL del servidor de velocidad"
        style={styles.input}
        value={url}
        onChangeText={setUrl}
        editable={!running}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        placeholder="http://IP-DE-TU-PC:5050"
        placeholderTextColor={colors.muted}
      />
      <Text style={styles.note}>
        En Wi-Fi usá la IP privada de la PC. Para medir 4G necesitás un servidor
        accesible por HTTPS.
      </Text>
      <View style={styles.row}>
        {[1, 5, 10].map(size => (
          <Pressable
            key={size}
            disabled={running}
            accessibilityRole="button"
            accessibilityState={{ selected: size === mib, disabled: running }}
            onPress={() => setMib(size)}
            style={[styles.choice, size === mib && styles.selected]}
          >
            <Text style={styles.note}>{size} MiB</Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        style={styles.button}
        accessibilityLabel="Control de medición de velocidad"
        onPress={() => (running ? cancel() : start())}
      >
        <Text style={styles.buttonText}>
          {running ? 'Cancelar velocidad' : 'Iniciar velocidad'}
        </Text>
      </Pressable>
      <Text accessibilityLiveRegion="polite" style={styles.note}>
        {message}
      </Text>
      {results.map((result, index) => (
        <Text key={index} style={styles.result}>
          Ronda {Math.floor(index / 2) + 1} ·{' '}
          {result.direction === 'download' ? '↓' : '↑'} {result.mbps.toFixed(2)}{' '}
          Mbps · {(result.durationMs / 1000).toFixed(2)} s
        </Text>
      ))}
      <Text style={styles.note}>
        Mbps = bytes completos × 8 / duración. Incluye conexión y respuesta del
        servidor; no equivale a capacidad máxima contratada. La subida termina
        al recibir confirmación y luego valida su eco.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 20,
    gap: 12,
  },
  title: { color: colors.ink, fontSize: 19, fontWeight: '700' },
  note: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    color: colors.ink,
  },
  row: { flexDirection: 'row', gap: 8 },
  choice: {
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
  },
  selected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  buttonText: { color: colors.surface, fontWeight: '700' },
  result: { color: colors.ink, fontSize: 15 },
});
