import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../theme';
import { summarize, Transport } from './statistics';
import { SAMPLE_COUNT, TIMEOUT_MS, useMeasurements } from './useMeasurements';
import NativeQosHistory from '../specs/NativeQosHistory';
import type { Target } from './statistics';

const initialTargets = ['1.1.1.1', '8.8.8.8', '9.9.9.9'].map(host => ({
  host,
  port: '53',
  transport: 'tcp' as Transport,
}));
const formatMs = (value: number | null) =>
  value === null ? '—' : `${value.toFixed(1)} ms`;
const statuses: Record<string, string> = {
  timeout: 'sin respuesta a tiempo',
  dnsTimeout: 'DNS agotó el plazo',
  dnsError: 'dominio no resuelto',
  refused: 'puerto rechazado',
  offline: 'sin red activa',
  error: 'error de socket',
};

export function MeasurementsCard({
  networkKey,
  connected,
  onRunningChange,
}: {
  networkKey: string;
  connected: boolean | null;
  onRunningChange?: (running: boolean) => void;
}) {
  const [targets, setTargets] = useState(initialTargets);
  const measurement = useMeasurements(networkKey, connected);
  useEffect(() => {
    onRunningChange?.(measurement.running);
  }, [measurement.running, onRunningChange]);
  useEffect(() => {
    let mounted = true;
    NativeQosHistory?.getSettings()
      .then(value => {
        const saved = JSON.parse(value).targets as Target[] | undefined;
        if (mounted && saved?.length === 3)
          setTargets(
            saved.map(target => ({ ...target, port: String(target.port) })),
          );
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  function edit(index: number, field: 'host' | 'port', value: string) {
    setTargets(current =>
      current.map((target, i) =>
        i === index ? { ...target, [field]: value } : target,
      ),
    );
  }

  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.title}>
        Medir latencia
      </Text>
      <Text style={styles.description}>
        Compará tres destinos. {SAMPLE_COUNT} sondas por destino, con hasta{' '}
        {TIMEOUT_MS / 1000} s de espera de respuesta por sonda. Mantené la app
        en primer plano; podés cambiar de sección.
      </Text>
      {targets.map((target, index) => (
        <View key={index} style={styles.target}>
          <Text style={styles.label}>Destino {index + 1}</Text>
          <TextInput
            accessibilityLabel={`Host del destino ${index + 1}`}
            placeholder="IP o dominio"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            editable={!measurement.running}
            value={target.host}
            onChangeText={value => edit(index, 'host', value)}
            style={styles.input}
          />
          <View style={styles.row}>
            <TextInput
              accessibilityLabel={`Puerto del destino ${index + 1}`}
              keyboardType="number-pad"
              editable={!measurement.running}
              value={target.port}
              onChangeText={value => edit(index, 'port', value)}
              style={[styles.input, styles.port]}
            />
            {(['tcp', 'udp'] as const).map(transport => (
              <Pressable
                key={transport}
                accessibilityRole="button"
                accessibilityLabel={`${transport.toUpperCase()} para destino ${
                  index + 1
                }`}
                accessibilityState={{
                  selected: target.transport === transport,
                  disabled: measurement.running,
                }}
                disabled={measurement.running}
                onPress={() =>
                  setTargets(current =>
                    current.map((item, i) =>
                      i === index ? { ...item, transport } : item,
                    ),
                  )
                }
                style={[
                  styles.choice,
                  target.transport === transport && styles.selected,
                ]}
              >
                <Text style={styles.choiceText}>{transport.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
      <Text style={styles.description}>
        TCP mide el tiempo para conectar al puerto. UDP necesita nuestro
        servidor de eco; no funciona contra cualquier sitio web. Destinos
        iniciales: Cloudflare, Google y Quad9. No cambia el DNS del teléfono.
      </Text>
      <Pressable
        accessibilityRole="button"
        style={styles.button}
        onPress={() =>
          measurement.running
            ? measurement.cancel()
            : measurement.start(
                targets.map(target => ({
                  ...target,
                  host: target.host.trim(),
                  port: Number(target.port),
                })),
              )
        }
      >
        <Text style={styles.buttonText}>
          {measurement.running ? 'Cancelar medición' : 'Iniciar medición'}
        </Text>
      </Pressable>
      {measurement.message && (
        <Text accessibilityRole="alert" style={styles.description}>
          {measurement.message}
        </Text>
      )}
      {measurement.results.length > 0 && (
        <Text style={styles.label}>
          Red al iniciar: {measurement.measuredNetwork}
        </Text>
      )}
      {measurement.results.map((entry, index) => {
        const stats = summarize(entry.samples, entry.target.transport);
        const errors = entry.samples.filter(sample => sample.status !== 'ok');
        const last = entry.samples[entry.samples.length - 1];
        return (
          <View key={index} style={styles.result}>
            <Text style={styles.label}>
              {entry.target.host}:{entry.target.port} ·{' '}
              {entry.target.transport.toUpperCase()}
            </Text>
            <Text style={styles.description}>
              {entry.samples.length}/{SAMPLE_COUNT} sondas · {stats.received}{' '}
              respuestas
            </Text>
            <Metric label="RTT mínimo" value={formatMs(stats.minimum)} />
            <Metric label="RTT promedio" value={formatMs(stats.average)} />
            <Metric label="RTT máximo" value={formatMs(stats.maximum)} />
            <Metric label="Jitter de RTT" value={formatMs(stats.jitter)} />
            {entry.target.transport === 'tcp' ? (
              <>
                <Metric
                  label="Sondas TCP fallidas"
                  value={`${stats.failed}/${stats.attempts}`}
                />
                <Text style={styles.note}>
                  TCP no permite medir la pérdida de paquetes con este ensayo.
                </Text>
              </>
            ) : (
              <>
                <Metric
                  label="Sin eco UDP en plazo"
                  value={
                    stats.lossPercent === null
                      ? '—'
                      : `${stats.lossPercent.toFixed(1)} %`
                  }
                />
                <Text style={styles.note}>
                  {stats.sent} enviados · {stats.missing} sin eco. Puede deberse
                  a pérdida, demora, filtros o al servidor; no identifica dónde
                  ocurrió.
                </Text>
              </>
            )}
            {last?.address && (
              <Text style={styles.note}>IP consultada: {last.address}</Text>
            )}
            {last && (
              <Text style={styles.note}>
                Última sonda: {new Date(last.timestamp).toLocaleTimeString()}
              </Text>
            )}
            {errors.length > 0 && (
              <Text style={styles.note}>
                Último fallo:{' '}
                {statuses[errors[errors.length - 1].status] ??
                  'sonda interrumpida'}
                .
              </Text>
            )}
          </View>
        );
      })}
      <Text style={styles.note}>
        Jitter: promedio de cambios absolutos entre RTT consecutivos válidos. Un
        guion indica que faltan datos. Descarga y subida se incorporarán en la
        siguiente etapa.
      </Text>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.description}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 24,
    padding: 20,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { color: colors.ink, fontSize: 17, fontWeight: '700' },
  description: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 21,
    marginTop: 10,
    flexShrink: 1,
  },
  label: { color: colors.ink, fontSize: 13, fontWeight: '600', marginTop: 16 },
  target: { marginTop: 4 },
  input: {
    color: colors.ink,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    minHeight: 48,
    marginTop: 8,
  },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  port: { flex: 1 },
  choice: {
    padding: 12,
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selected: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  choiceText: { color: colors.accent, fontWeight: '600' },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    minHeight: 48,
    padding: 14,
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: colors.surface, fontWeight: '600', fontSize: 14 },
  result: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 18 },
  metric: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'baseline',
  },
  value: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  note: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 10 },
});
