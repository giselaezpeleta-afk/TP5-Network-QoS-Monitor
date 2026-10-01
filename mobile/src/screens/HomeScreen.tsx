import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import NetInfo, { useNetInfo } from '@react-native-community/netinfo';
import { SafeAreaView } from 'react-native-safe-area-context';
import { connectionSummary } from '../network/connectionSummary';
import { colors } from '../theme';
import { useTelephony } from '../telephony/useTelephony';
import { TelephonyCard } from '../telephony/TelephonyCard';
import { MeasurementsCard } from '../measurements/MeasurementsCard';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export function HomeScreen() {
  // El hook escucha cambios de Android y elimina su suscripción al desmontarse.
  const network = useNetInfo();
  const summary = connectionSummary(network);
  const telephony = useTelephony(network.type);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshConnection() {
    if (refreshing) {
      return;
    }
    setRefreshing(true);
    setError(null);
    try {
      // Actualiza el mismo estado que observa useNetInfo, sin ejecutar un speed test.
      await NetInfo.refresh();
      telephony.refresh();
    } catch {
      setError('No pudimos actualizar la conexión. Volvé a intentar.');
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.brandMark} accessible={false}>
            <Text style={styles.brandLetters}>NQ</Text>
          </View>
          <View style={styles.brandText}>
            <Text style={styles.brandName}>Network QoS</Text>
            <Text style={styles.brandSubtitle}>MONITOR DE RED</Text>
          </View>
        </View>

        <Text accessibilityRole="header" style={styles.title}>
          Tu conexión
        </Text>
        <Text style={styles.intro}>La red de tu teléfono, en un vistazo.</Text>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>RED ACTIVA</Text>
          <Text style={styles.networkName}>{summary.network}</Text>
          <View style={styles.statusLine} accessibilityLiveRegion="polite">
            <View
              style={[
                styles.statusDot,
                { backgroundColor: colors[summary.tone] },
              ]}
            />
            <Text style={styles.statusText}>{summary.status}</Text>
          </View>
          <View style={styles.heroDivider} />
          <Text style={styles.heroNote}>
            Se actualiza cuando cambia tu conexión.
          </Text>
        </View>

        <View style={styles.sectionHeading}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            Estado de la red
          </Text>
          <Text style={styles.sectionTag}>EN VIVO</Text>
        </View>
        <View style={styles.detailsCard}>
          <DetailRow label="Tipo de conexión" value={summary.network} />
          <DetailRow label="Acceso a Internet" value={summary.internet} />
          {summary.generation !== null && (
            <DetailRow label="Generación celular" value={summary.generation} />
          )}
          {summary.carrier !== null && (
            <DetailRow label="Operador" value={summary.carrier} />
          )}
          <DetailRow label="Uso de datos" value={summary.metered} />
          <Text style={styles.detailsNote}>
            Información reportada por Android. Una conexión activa no indica su
            velocidad ni su calidad.
          </Text>
        </View>

        {error !== null && (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: refreshing, busy: refreshing }}
          disabled={refreshing}
          onPress={refreshConnection}
          style={({ pressed }) => [
            styles.button,
            (pressed || refreshing) && styles.buttonPressed,
          ]}
        >
          {refreshing && <ActivityIndicator color={colors.surface} />}
          <Text style={styles.buttonText}>
            {refreshing ? 'Actualizando…' : 'Actualizar conexión'}
          </Text>
        </Pressable>

        <TelephonyCard
          state={telephony}
          cellularActive={network.type === 'cellular'}
        />

        <MeasurementsCard
          networkKey={`${network.type}|${
            network.details && 'ipAddress' in network.details
              ? network.details.ipAddress
              : ''
          }`}
          connected={network.isConnected}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: 24,
    paddingBottom: 32,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 32,
  },
  brandMark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLetters: { color: colors.accent, fontSize: 17, fontWeight: '800' },
  brandText: { flex: 1 },
  brandName: { fontSize: 18, fontWeight: '700', color: colors.ink },
  brandSubtitle: {
    fontSize: 10,
    letterSpacing: 1.8,
    marginTop: 3,
    color: colors.muted,
    fontWeight: '600',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.6,
  },
  intro: {
    fontSize: 15,
    lineHeight: 23,
    marginTop: 6,
    marginBottom: 22,
    color: colors.muted,
  },
  hero: { borderRadius: 24, padding: 24, backgroundColor: colors.hero },
  eyebrow: {
    color: colors.heroMuted,
    fontSize: 11,
    letterSpacing: 1.8,
    fontWeight: '600',
  },
  networkName: {
    color: colors.surface,
    fontSize: 36,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 14,
  },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: colors.surface, fontSize: 14, flexShrink: 1 },
  heroDivider: { height: 1, backgroundColor: '#354967', marginVertical: 20 },
  heroNote: { color: colors.heroMuted, fontSize: 12, lineHeight: 18 },
  sectionHeading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 26,
    marginBottom: 12,
  },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: '700' },
  sectionTag: {
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.accent,
    fontWeight: '700',
  },
  detailsCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 18,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  detailLabel: { flex: 1, color: colors.muted, fontSize: 13, lineHeight: 20 },
  detailValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
    color: colors.ink,
  },
  detailsNote: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 19,
    paddingVertical: 16,
  },
  button: {
    minHeight: 52,
    padding: 16,
    backgroundColor: colors.accent,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  buttonPressed: { opacity: 0.75 },
  buttonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  error: { color: '#9E341B', marginTop: 16, fontSize: 14, lineHeight: 21 },
});
