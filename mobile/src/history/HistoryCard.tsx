import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import NativeQosHistory from '../specs/NativeQosHistory';
import { HistoryRow } from './model';
import { Action, panelStyles } from './MonitorCard';
import { SessionChart } from './SessionChart';
import { QualityMap } from './QualityMap';

export function buildFilters(
  network: string,
  from: string,
  to: string,
  bounds: string,
) {
  const result: Record<string, string | number> = {};
  if (network) result.network = network;
  for (const [key, value] of [
    ['from', from],
    ['to', to],
  ]) {
    if (!value.trim()) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
      throw new Error('Fecha esperada: AAAA-MM-DD.');
    const date = new Date(`${value}T00:00:00`);
    if (
      !Number.isFinite(date.getTime()) ||
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        '0',
      )}-${String(date.getDate()).padStart(2, '0')}` !== value
    )
      throw new Error('Fecha inválida.');
    if (key === 'to') date.setHours(23, 59, 59, 999);
    result[key] = date.getTime();
  }
  if (result.from != null && result.to != null && result.from > result.to)
    throw new Error('La fecha inicial debe ser anterior a la final.');
  if (bounds.trim()) {
    const values = bounds
      .split(',')
      .map(value => (value.trim() ? Number(value) : NaN));
    if (values.length !== 4 || !values.every(Number.isFinite))
      throw new Error('Área: sur,oeste,norte,este con cuatro coordenadas.');
    const [south, west, north, east] = values;
    if (
      south < -90 ||
      north > 90 ||
      south > north ||
      west < -180 ||
      east > 180 ||
      west > east
    )
      throw new Error('Límites geográficos inválidos.');
    Object.assign(result, { south, west, north, east });
  }
  return result;
}

export function HistoryCard({
  mode = 'history',
  active = true,
}: {
  mode?: 'history' | 'map';
  active?: boolean;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const loading = useRef(false);
  const applied = useRef('{}');
  const [network, setNetwork] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [bounds, setBounds] = useState('');
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState(
    'Aplicá filtros o cargá todas las mediciones.',
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(500);
  const [busy, setBusy] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState('{}');
  // Al entrar se refrescan los filtros ya aplicados. Editar un campo no lanza
  // consultas ni cambia el mapa hasta tocar Aplicar filtros.
  const loadFiltered = useCallback(async (filters: string) => {
    if (!NativeQosHistory || loading.current) return;
    loading.current = true;
    setBusy(true);
    try {
      const result = JSON.parse(await NativeQosHistory.query(filters));
      const settings = JSON.parse(await NativeQosHistory.getSettings());
      setThreshold(settings.rttThreshold ?? 500);
      setRows(result.rows);
      setTotal(result.total);
      setSelected(previous =>
        result.rows.some((row: HistoryRow) => row.session === previous)
          ? previous
          : null,
      );
      setAppliedFilters(filters);
      applied.current = filters;
      setMessage(
        result.total
          ? `${result.total} muestras encontradas. Se muestran hasta 2000; exportación incluye todas las filtradas.`
          : 'No hay mediciones para estos filtros.',
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo cargar el historial.',
      );
    } finally {
      loading.current = false;
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    if (active) loadFiltered(applied.current);
  }, [active, mode, loadFiltered]);
  async function load() {
    try {
      await loadFiltered(
        JSON.stringify(buildFilters(network, from, to, bounds)),
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Revisá los filtros.',
      );
    }
  }
  async function exportFile(format: string) {
    setBusy(true);
    try {
      await NativeQosHistory?.exportFile(appliedFilters, format);
      setMessage(
        'Se abrió el selector de Android para compartir el archivo de los filtros aplicados.',
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo exportar el historial.',
      );
    } finally {
      setBusy(false);
    }
  }
  const sessions = [...new Set(rows.map(row => row.session))];
  return (
    <View style={panelStyles.card}>
      <Text accessibilityRole="header" style={panelStyles.title}>
        {mode === 'map' ? 'Mapa de mediciones' : 'Sesiones guardadas'}
      </Text>
      <Action
        title={filtersOpen ? 'Ocultar filtros' : 'Filtrar mediciones'}
        onPress={() => setFiltersOpen(!filtersOpen)}
      />
      {filtersOpen && (
        <>
          <Text style={panelStyles.text}>
            Filtros de red, fecha local y área geográfica. Dejá los campos
            vacíos para incluir todo.
          </Text>
          <View style={panelStyles.row}>
            {[
              ['', 'Todas'],
              ['wifi', 'Wi-Fi'],
              ['cellular', 'Móvil'],
            ].map(([value, label]) => (
              <Action
                key={value}
                title={`${network === value ? '✓ ' : ''}${label}`}
                onPress={() => setNetwork(value)}
              />
            ))}
          </View>
          <TextInput
            accessibilityLabel="Fecha desde"
            placeholder="Desde AAAA-MM-DD"
            value={from}
            onChangeText={setFrom}
            style={panelStyles.input}
          />
          <TextInput
            accessibilityLabel="Fecha hasta"
            placeholder="Hasta AAAA-MM-DD"
            value={to}
            onChangeText={setTo}
            style={panelStyles.input}
          />
          <TextInput
            accessibilityLabel="Área geográfica sur oeste norte este"
            placeholder="Área: sur,oeste,norte,este"
            value={bounds}
            onChangeText={setBounds}
            style={panelStyles.input}
          />
          <Action
            title="Aplicar filtros y actualizar"
            disabled={busy}
            onPress={load}
          />
        </>
      )}
      <Action
        title="Actualizar mediciones"
        disabled={busy}
        onPress={() => loadFiltered(applied.current)}
      />
      <Text accessibilityLiveRegion="polite" style={panelStyles.text}>
        {busy ? 'Cargando mediciones…' : message}
      </Text>
      {mode === 'map' ? (
        <>
          <Text style={panelStyles.text}>
            El mapa usa las sondas de latencia con ubicación. Habilitá ubicación
            en Monitoreo y ejecutá una prueba de Latencia para agregar puntos.
          </Text>
          {active && <QualityMap rows={rows} threshold={threshold} />}
        </>
      ) : (
        <>
          <View style={panelStyles.row}>
            <Action
              title="Exportar CSV"
              disabled={busy || total === 0}
              onPress={() => exportFile('csv')}
            />
            <Action
              title="Exportar JSON"
              disabled={busy || total === 0}
              onPress={() => exportFile('json')}
            />
          </View>
          <Text style={panelStyles.text}>
            Sesiones ({sessions.length}). Elegí una para ver sus series
            temporales. Las sesiones que excedan el límite visible pueden
            aparecer parciales.
          </Text>
          {sessions.map(session => {
            const samples = rows.filter(row => row.session === session);
            const date = new Date(
              samples[samples.length - 1].timestamp,
            ).toLocaleString();
            return (
              <Action
                key={session}
                title={`${date} · ${samples[0].network} · ${
                  samples[0].kind === 'latency' ? 'latencia' : 'velocidad'
                } · ${samples.length} muestras`}
                onPress={() =>
                  setSelected(selected === session ? null : session)
                }
              />
            );
          })}
          {selected && (
            <SessionChart rows={rows.filter(row => row.session === selected)} />
          )}
        </>
      )}
    </View>
  );
}
