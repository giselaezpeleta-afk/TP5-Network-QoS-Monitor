import React, { useEffect, useState } from 'react';
import {
  AppState,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import NativeQosHistory from '../specs/NativeQosHistory';
import {
  acquireMeasurement,
  defaults,
  releaseMeasurement,
  Settings,
} from './model';
import { colors } from '../theme';

export const panelStyles = StyleSheet.create({
  card: {
    flexShrink: 0,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
    gap: 12,
  },
  title: { color: colors.ink, fontSize: 19, fontWeight: '700' },
  text: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  fieldLabel: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 6,
  },
  fieldGroup: { flexShrink: 0, gap: 4 },
  stateBox: {
    flexShrink: 0,
    backgroundColor: colors.accentSoft,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  activeBox: { backgroundColor: '#E2F3EB' },
  disabledButton: { opacity: 0.5 },
  input: {
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
  },
  button: { padding: 13, borderRadius: 12, backgroundColor: colors.accentSoft },
  buttonText: { color: colors.accent, fontWeight: '700' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
export function Action({
  title,
  onPress,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      accessibilityState={{ disabled }}
      style={[panelStyles.button, disabled && panelStyles.disabledButton]}
      onPress={onPress}
    >
      <Text style={panelStyles.buttonText}>{title}</Text>
    </Pressable>
  );
}

export function MonitorCard() {
  const [status, setStatus] = useState('Detenido');
  const [message, setMessage] = useState(
    'Ubicación opcional para las pruebas manuales; necesaria para el monitoreo con pantalla apagada.',
  );
  const [busy, setBusy] = useState(false);
  const [targets, setTargets] = useState(defaults.targets);
  const [fields, setFields] = useState({
    intervalSeconds: '60',
    rttThreshold: '500',
    jitterThreshold: '100',
    failureThreshold: '50',
  });
  useEffect(() => {
    let mounted = true;
    NativeQosHistory?.getSettings()
      .then(value => {
        const saved = { ...defaults, ...JSON.parse(value) } as Settings;
        if (mounted) setTargets(saved.targets);
        if (mounted)
          setFields({
            intervalSeconds: String(saved.intervalSeconds),
            rttThreshold: String(saved.rttThreshold),
            jitterThreshold: String(saved.jitterThreshold),
            failureThreshold: String(saved.failureThreshold),
          });
      })
      .catch(() => {
        if (mounted) setMessage('No se pudo leer la configuración guardada.');
      });
    async function refresh() {
      try {
        const state = await NativeQosHistory?.monitoringStatus();
        if (mounted && state) setStatus(state);
      } catch {
        if (mounted) setMessage('No se pudo consultar el monitoreo.');
      }
    }
    refresh();
    const timer = setInterval(refresh, 2000);
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active')
        NativeQosHistory?.setLocationEnabled(false).catch(() => {});
      else refresh();
    });
    return () => {
      mounted = false;
      clearInterval(timer);
      subscription.remove();
      NativeQosHistory?.setLocationEnabled(false).catch(() => {});
    };
  }, []);
  async function location() {
    const permissions = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    ]);
    if (
      !Object.values(permissions).includes(PermissionsAndroid.RESULTS.GRANTED)
    )
      throw new Error(
        'Sin permiso: las pruebas manuales se guardarán sin posición.',
      );
    const state = await NativeQosHistory?.setLocationEnabled(true);
    if (state !== 'listening')
      throw new Error('Activá Ubicación en los ajustes rápidos del teléfono.');
    setMessage(
      'Buscando ubicación. Cada muestra guardará precisión y antigüedad; las posiciones de más de 60 segundos se descartan.',
    );
  }
  async function action(operation: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await operation();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo completar la acción.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function start() {
    if (!NativeQosHistory) throw new Error('Instalá el APK actualizado.');
    if (!acquireMeasurement('monitor-start'))
      throw new Error('Esperá a que termine la medición manual.');
    try {
      await location();
      if (Number(Platform.Version) >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED)
          throw new Error(
            'Permití notificaciones para ver las alertas y controlar el monitoreo.',
          );
      }
      const saved = JSON.parse(await NativeQosHistory.getSettings());
      const settings = {
        ...defaults,
        ...saved,
        ...Object.fromEntries(
          Object.entries(fields).map(([key, value]) => [key, Number(value)]),
        ),
      };
      setTargets(settings.targets);
      setStatus('Iniciando…');
      await NativeQosHistory.startMonitoring(JSON.stringify(settings));
      await NativeQosHistory.saveSettings(JSON.stringify(settings));
      setStatus(await NativeQosHistory.monitoringStatus());
      setMessage(
        'El monitoreo usa los destinos de la última medición manual. Guardará un lote de 10 sondas por destino, seguido del intervalo elegido.',
      );
    } finally {
      releaseMeasurement('monitor-start');
    }
  }
  const labels: Record<keyof typeof fields, string> = {
    intervalSeconds: 'Pausa entre lotes (60–3600 s)',
    rttThreshold: 'Alerta RTT medio (ms)',
    jitterThreshold: 'Alerta jitter (ms)',
    failureThreshold: 'Alerta fallos TCP / ecos UDP ausentes (%)',
  };
  return (
    <>
      <View collapsable={false} style={panelStyles.card}>
        <Text accessibilityRole="header" style={panelStyles.title}>
          Ubicación y monitoreo
        </Text>
        <Text style={panelStyles.text}>{message}</Text>
        <Action
          title="Habilitar ubicación"
          disabled={busy}
          onPress={() => action(location)}
        />
        <View
          collapsable={false}
          style={[
            panelStyles.stateBox,
            status === 'Activo' && panelStyles.activeBox,
          ]}
        >
          <Text accessibilityLiveRegion="polite" style={panelStyles.title}>
            Estado: {status}
          </Text>
          <Text style={panelStyles.text}>
            {status === 'Activo'
              ? 'El servicio está activo. Guarda sondas en el Historial aunque apagues la pantalla. No realiza pruebas de velocidad.'
              : 'Iniciá el monitoreo para guardar lotes de latencia automáticamente.'}
          </Text>
          {status === 'Activo' && (
            <>
              <Text style={panelStyles.fieldLabel}>
                Destinos monitoreados · 10 sondas por destino
              </Text>
              {targets.map(target => (
                <Text
                  key={`${target.host}:${target.port}`}
                  style={panelStyles.text}
                >
                  {target.host}:{target.port} · {target.transport.toUpperCase()}
                </Text>
              ))}
              <Text style={panelStyles.text}>
                Pausa configurada después de cada lote: {fields.intervalSeconds}{' '}
                s. Revisá las nuevas sesiones en Historial.
              </Text>
            </>
          )}
          <Action
            title={
              busy
                ? 'Procesando…'
                : status === 'Activo'
                ? 'Monitoreo iniciado'
                : status === 'Iniciando…'
                ? 'Iniciando monitoreo…'
                : 'Iniciar monitoreo periódico'
            }
            disabled={
              busy ||
              status === 'Activo' ||
              status === 'Iniciando…' ||
              status === 'Deteniendo…'
            }
            onPress={() => action(start)}
          />
          <Action
            title={
              status === 'Deteniendo…'
                ? 'Deteniendo monitoreo…'
                : 'Detener monitoreo'
            }
            disabled={busy || (status !== 'Activo' && status !== 'Iniciando…')}
            onPress={() =>
              action(async () => {
                setStatus('Deteniendo…');
                await NativeQosHistory?.stopMonitoring();
                // La consulta periódica confirma la detención real del servicio.
                setMessage(
                  'Se solicitó detener el monitoreo. El estado se actualizará cuando Android lo confirme.',
                );
              })
            }
          />
        </View>
      </View>
      {/* Separar controles y ajustes permite que cada tarjeta crezca sin
        superponer etiquetas cuando cambia el estado del servicio. */}
      <View collapsable={false} style={panelStyles.card}>
        <Text style={panelStyles.fieldLabel}>
          Configuración de intervalos y alertas
        </Text>
        {Object.entries(fields).map(([key, value]) => (
          <View key={key} collapsable={false} style={panelStyles.fieldGroup}>
            <Text style={panelStyles.text}>
              {labels[key as keyof typeof fields]}
            </Text>
            <TextInput
              accessibilityLabel={labels[key as keyof typeof fields]}
              style={panelStyles.input}
              keyboardType="numeric"
              value={value}
              editable={
                !['Activo', 'Iniciando…', 'Deteniendo…'].includes(status) &&
                !busy
              }
              onChangeText={text =>
                setFields(current => ({ ...current, [key]: text }))
              }
            />
          </View>
        ))}
        <Text style={panelStyles.text}>
          Valores iniciales de prueba, editables. Alertas como máximo cada 5
          minutos. No ejecuta descargas automáticas. Android puede diferir
          intervalos al ahorrar batería y limita la duración del servicio;
          Forzar detención lo interrumpe.
        </Text>
      </View>
    </>
  );
}
