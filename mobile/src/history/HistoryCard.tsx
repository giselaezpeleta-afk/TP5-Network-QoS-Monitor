import React, { useState } from 'react';
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

export function HistoryCard() {
  const [opened, setOpened] = useState(false);
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
  const [map, setMap] = useState(false);
  const [threshold, setThreshold] = useState(500);
  const [busy, setBusy] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState('{}');
  async function load() {
    if (!NativeQosHistory || busy) return;
    setBusy(true);
    try {
      const filters = JSON.stringify(buildFilters(network, from, to, bounds));
      const result = JSON.parse(await NativeQosHistory.query(filters));
      const settings = JSON.parse(await NativeQosHistory.getSettings());
      setThreshold(settings.rttThreshold ?? 500);
      setRows(result.rows);
      setTotal(result.total);
      setSelected(null);
      setAppliedFilters(filters);
      setMessage(
        result.total
          ? `${result.total} muestras encontradas. Vista limitada a las 2000 más recientes; exportación incluye todas las filtradas.`
          : 'No hay mediciones para estos filtros.',
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo cargar el historial.',
      );
    } finally {
      setBusy(false);
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
        Historial, gráficos y mapa
      </Text>
      <Action
        title={opened ? 'Ocultar historial' : 'Abrir historial'}
        onPress={() => setOpened(!opened)}
      />
      {opened && (
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
          <Text accessibilityLiveRegion="polite" style={panelStyles.text}>
            {message}
          </Text>
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
          <Action
            title={map ? 'Ocultar mapa' : 'Mostrar mapa de calor'}
            onPress={() => setMap(!map)}
          />
          {map && <QualityMap rows={rows} threshold={threshold} />}
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
