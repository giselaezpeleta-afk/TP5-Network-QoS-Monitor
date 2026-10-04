import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNetInfo } from '@react-native-community/netinfo';
import { HomeScreen } from './HomeScreen';
import { MeasurementsCard } from '../measurements/MeasurementsCard';
import { ThroughputCard } from '../measurements/ThroughputCard';
import { MonitorCard } from '../history/MonitorCard';
import { HistoryCard } from '../history/HistoryCard';
import { colors } from '../theme';

const sections = [
  { id: 'inicio', title: 'Inicio', note: 'Conexión, operador y señal' },
  { id: 'latencia', title: 'Latencia', note: 'Destinos, RTT y jitter' },
  { id: 'velocidad', title: 'Velocidad', note: 'Descarga y subida' },
  {
    id: 'monitoreo',
    title: 'Monitoreo',
    note: 'Ubicación, intervalos y alertas',
  },
  {
    id: 'historial',
    title: 'Historial',
    note: 'Sesiones, gráficos y exportación',
  },
  { id: 'mapa', title: 'Mapa', note: 'Mediciones con ubicación' },
] as const;
type Section = (typeof sections)[number]['id'];

function Panel({
  active,
  children,
  scroll = true,
  resetKey,
}: {
  active: boolean;
  children: React.ReactNode;
  scroll?: boolean;
  resetKey?: string;
}) {
  const scrollView = useRef<React.ComponentRef<typeof ScrollView>>(null);
  useEffect(() => {
    scrollView.current?.scrollTo({ y: 0, animated: false });
  }, [resetKey]);
  return (
    <View
      style={active ? styles.panel : styles.hidden}
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
    >
      {scroll ? (
        <ScrollView
          ref={scrollView}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </View>
  );
}

export function AppNavigator() {
  const [section, setSection] = useState<Section>('inicio');
  const [visited, setVisited] = useState<Section[]>(['inicio']);
  const [menu, setMenu] = useState(false);
  const [running, setRunning] = useState<'latencia' | 'velocidad' | null>(null);
  const network = useNetInfo();
  const current = sections.find(item => item.id === section)!;
  const historyVisible = section === 'historial' || section === 'mapa';

  function navigate(next: Section) {
    setSection(next);
    setVisited(items => (items.includes(next) ? items : [...items, next]));
    setMenu(false);
  }
  const latencyChanged = useCallback((active: boolean) => {
    setRunning(previous =>
      active ? 'latencia' : previous === 'latencia' ? null : previous,
    );
  }, []);
  const speedChanged = useCallback((active: boolean) => {
    setRunning(previous =>
      active ? 'velocidad' : previous === 'velocidad' ? null : previous,
    );
  }, []);
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (section === 'inicio') return false;
        setSection('inicio');
        return true;
      },
    );
    return () => subscription.remove();
  }, [section]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.brand}>
          <Text style={styles.brandText}>NQ</Text>
        </View>
        <View style={styles.heading}>
          <Text style={styles.appName}>Network QoS</Text>
          <Text accessibilityRole="header" style={styles.sectionName}>
            {current.title}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir menú de secciones"
          accessibilityState={{ expanded: menu }}
          style={styles.menuButton}
          onPress={() => setMenu(true)}
        >
          <Text style={styles.menuText}>☰ Menú</Text>
        </Pressable>
      </View>
      {running && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver a la medición en curso"
          style={styles.running}
          onPress={() => navigate(running)}
        >
          <Text style={styles.runningText}>
            ● {running === 'latencia' ? 'Latencia' : 'Velocidad'} en curso · Ver
            prueba
          </Text>
        </Pressable>
      )}

      {/* Se monta una sección al visitarla y luego se conserva oculta. Navegar no
        cancela sondas, pierde formularios ni desactiva el GPS del monitoreo. */}
      <Panel active={section === 'inicio'} scroll={false}>
        <HomeScreen network={network} />
      </Panel>
      {visited.includes('latencia') && (
        <Panel active={section === 'latencia'}>
          <Text style={styles.hint}>
            Para guardar la posición, habilitá ubicación desde Monitoreo.
          </Text>
          <MeasurementsCard
            networkKey={`${network.type}|${
              network.details && 'ipAddress' in network.details
                ? network.details.ipAddress
                : ''
            }`}
            connected={network.isConnected}
            onRunningChange={latencyChanged}
          />
        </Panel>
      )}
      {visited.includes('velocidad') && (
        <Panel active={section === 'velocidad'}>
          <Text style={styles.hint}>
            Configurá tu servidor y elegí el tamaño de la prueba.
          </Text>
          <ThroughputCard
            networkKey={`${network.type}|${network.isConnected}`}
            onRunningChange={speedChanged}
          />
        </Panel>
      )}
      {visited.includes('monitoreo') && (
        <Panel active={section === 'monitoreo'}>
          <MonitorCard />
        </Panel>
      )}
      {(visited.includes('historial') || visited.includes('mapa')) && (
        <Panel
          active={historyVisible}
          resetKey={section === 'mapa' ? 'map' : 'history'}
        >
          <HistoryCard
            mode={section === 'mapa' ? 'map' : 'history'}
            active={historyVisible}
          />
        </Panel>
      )}

      <Modal
        visible={menu}
        transparent
        animationType="fade"
        onRequestClose={() => setMenu(false)}
      >
        <View style={styles.overlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityRole="button"
            accessibilityLabel="Cerrar menú"
            onPress={() => setMenu(false)}
          />
          <SafeAreaView style={styles.drawer} accessibilityViewIsModal>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>Secciones</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cerrar menú de secciones"
                style={styles.menuButton}
                onPress={() => setMenu(false)}
              >
                <Text style={styles.menuText}>Cerrar ×</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.menuContent}>
              {sections.map(item => (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Ir a ${item.title}`}
                  accessibilityState={{ selected: section === item.id }}
                  onPress={() => navigate(item.id)}
                  style={[
                    styles.menuItem,
                    section === item.id && styles.selected,
                  ]}
                >
                  <Text
                    style={[
                      styles.itemTitle,
                      section === item.id && styles.selectedText,
                    ]}
                  >
                    {item.title}
                  </Text>
                  <Text style={styles.itemNote}>{item.note}</Text>
                </Pressable>
              ))}
              <Text style={styles.hint}>
                Los resultados y la configuración se conservan al cambiar de
                sección.
              </Text>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  panel: { flex: 1 },
  hidden: { display: 'none' },
  content: {
    padding: 20,
    paddingBottom: 32,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brand: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  brandText: { color: colors.accent, fontWeight: '800', fontSize: 16 },
  heading: { flex: 1 },
  appName: { fontSize: 12, color: colors.muted },
  sectionName: { fontSize: 20, color: colors.ink, fontWeight: '700' },
  menuButton: {
    minHeight: 48,
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.accentSoft,
  },
  menuText: { color: colors.accent, fontWeight: '700', fontSize: 14 },
  running: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.accentSoft,
  },
  runningText: { color: colors.accent, fontWeight: '600', fontSize: 13 },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  overlay: { flex: 1, backgroundColor: '#10203988', alignItems: 'flex-end' },
  drawer: {
    width: '88%',
    maxWidth: 380,
    flex: 1,
    backgroundColor: colors.surface,
  },
  drawerHeader: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  drawerTitle: { fontSize: 22, color: colors.ink, fontWeight: '700' },
  menuContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 8 },
  menuItem: {
    minHeight: 68,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selected: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  itemTitle: { fontSize: 16, color: colors.ink, fontWeight: '700' },
  selectedText: { color: colors.accent },
  itemNote: { fontSize: 12, color: colors.muted, marginTop: 4, lineHeight: 18 },
});
