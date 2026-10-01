import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import { useTelephony } from './useTelephony';

type Props = {
  state: ReturnType<typeof useTelephony>;
  cellularActive: boolean;
};

export function TelephonyCard({ state, cellularActive }: Props) {
  const { snapshot, error, requesting, permissionState } = state;
  const status = snapshot?.status;
  const needsPermission = status === 'permissionRequired';

  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.title}>
        Señal celular
      </Text>
      <Text style={styles.description}>
        {cellularActive
          ? 'SIM usada para datos móviles.'
          : 'SIM de datos. Esta señal no corresponde a tu conexión Wi-Fi.'}
      </Text>
      {error && (
        <Text accessibilityRole="alert" style={styles.description}>
          {error}
        </Text>
      )}
      {!snapshot && !error && (
        <Text style={styles.description}>Consultando telefonía…</Text>
      )}
      {needsPermission && (
        <>
          <Text style={styles.description}>
            Para consultar la tecnología celular y la señal, permití el acceso
            al estado del teléfono. No leemos contactos, números ni el historial
            de llamadas.
          </Text>
          {permissionState === 'denied' && (
            <Text style={styles.description}>
              Podés seguir usando el estado de red sin este permiso.
            </Text>
          )}
          {permissionState === 'blocked' && (
            <Text style={styles.description}>
              Podés habilitar el permiso Teléfono desde los ajustes de la app.
            </Text>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: requesting }}
            disabled={requesting}
            onPress={state.requestPermission}
            style={({ pressed }) => [
              styles.button,
              (pressed || requesting) && styles.pressed,
            ]}
          >
            <Text style={styles.buttonText}>
              {requesting
                ? 'Esperando permiso…'
                : permissionState === 'blocked'
                ? 'Abrir ajustes'
                : 'Habilitar señal celular'}
            </Text>
          </Pressable>
        </>
      )}
      {status === 'unsupported' && (
        <Text style={styles.description}>
          Este dispositivo no permite consultar la telefonía.
        </Text>
      )}
      {status === 'noSubscription' && (
        <Text style={styles.description}>
          No hay una SIM de datos activa. Revisá la SIM y el modo avión.
        </Text>
      )}
      {status === 'restricted' && (
        <Text style={styles.description}>
          Android restringió la consulta, aunque el permiso esté habilitado.
        </Text>
      )}
      {status === 'ready' && snapshot && (
        <>
          <Row
            label="Operador de red"
            value={snapshot.carrier ?? 'No disponible'}
          />
          <Row
            label="Tecnología de datos"
            value={snapshot.technology ?? 'No disponible'}
          />
          {snapshot.signals.map((signal, index) => (
            <View key={`${signal.technology}-${index}`} style={styles.reading}>
              <Row
                label={`${signal.technology} · ${signal.metric}`}
                value={
                  signal.dbm === null ? 'No disponible' : `${signal.dbm} dBm`
                }
              />
              {signal.metric !== 'RSSI' && (
                <Row
                  label={`${signal.technology} · RSSI`}
                  value={
                    signal.rssi === null
                      ? 'No disponible'
                      : `${signal.rssi} dBm`
                  }
                />
              )}
            </View>
          ))}
          {snapshot.signals.length === 0 && (
            <Text style={styles.description}>
              {snapshot.signalSupported
                ? 'Android no informó valores de señal disponibles.'
                : 'El detalle de señal requiere Android 10 o posterior.'}
            </Text>
          )}
          {snapshot.signalAgeMs !== null && (
            <Text style={styles.caption}>
              Antigüedad de la señal al consultar:{' '}
              {Math.floor(snapshot.signalAgeMs / 1000)} s.
            </Text>
          )}
          <Text style={styles.caption}>
            Última consulta: {new Date(snapshot.queriedAt).toLocaleTimeString()}
            .
          </Text>
          <Text style={styles.description}>
            La señal es el último dato del módem y puede no ser reciente. No
            mide velocidad. En redes 5G NSA, Android puede informar LTE.
          </Text>
        </>
      )}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
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
    marginTop: 12,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 21,
  },
  caption: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 10 },
  row: { flexDirection: 'row', gap: 12, paddingVertical: 12 },
  label: { flex: 1, fontSize: 13, lineHeight: 20, color: colors.muted },
  value: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: colors.ink,
    textAlign: 'right',
    fontWeight: '600',
  },
  reading: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  button: {
    minHeight: 48,
    padding: 14,
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 14, fontWeight: '600', color: colors.accent },
  pressed: { opacity: 0.7 },
});
