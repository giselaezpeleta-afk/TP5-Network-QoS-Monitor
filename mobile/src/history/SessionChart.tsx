import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { HistoryRow } from './model';
import { panelStyles } from './MonitorCard';

export function SessionChart({ rows }: { rows: HistoryRow[] }) {
  const series = new Map<string, HistoryRow[]>();
  for (const row of [...rows].sort((a, b) => a.timestamp - b.timestamp)) {
    const label =
      row.kind === 'latency'
        ? `${row.data.target?.host}:${row.data.target?.port} · ${
            row.data.target?.transport?.toUpperCase() ?? ''
          } · RTT ms`
        : `${row.data.direction === 'download' ? 'Descarga' : 'Subida'} · Mbps`;
    series.set(label, [...(series.get(label) ?? []), row]);
  }
  return (
    <View>
      {[...series].map(([label, samples]) => {
        const value = (row: HistoryRow) =>
          row.kind === 'latency'
            ? row.data.status === 'ok'
              ? row.data.rttMs
              : null
            : row.data.mbps;
        const validCount = samples.filter(
          row => value(row) != null && Number.isFinite(value(row)),
        ).length;
        if (validCount === 0) {
          return (
            <View key={label}>
              <Text style={panelStyles.fieldLabel}>{label}</Text>
              <Text style={panelStyles.text}>
                Sin respuestas válidas para graficar ({samples.length}{' '}
                muestras). No hay RTT disponible: los intentos fallidos no
                equivalen a 0 ms.
              </Text>
              {samples[0].data.target?.transport === 'udp' && (
                <Text style={panelStyles.text}>
                  UDP requiere un servidor de eco compatible. Un servidor DNS no
                  responde a estas sondas.
                </Text>
              )}
            </View>
          );
        }
        const max = Math.max(1, ...samples.map(row => value(row) ?? 0));
        const start = samples[0].timestamp;
        const span = Math.max(1, samples[samples.length - 1].timestamp - start);
        const x = (row: HistoryRow) =>
          40 + ((row.timestamp - start) / span) * 240;
        const y = (row: HistoryRow) => 135 - ((value(row) ?? 0) / max) * 105;
        // Un resultado ausente corta la línea; no interpolamos RTT perdidos.
        const segments: string[][] = [[]];
        samples.forEach(row => {
          if (value(row) == null) segments.push([]);
          else segments[segments.length - 1].push(`${x(row)},${y(row)}`);
        });
        return (
          <View key={label}>
            <Text style={panelStyles.text}>{label}</Text>
            <Text style={panelStyles.text}>
              {validCount}/{samples.length} muestras con datos.{' '}
              {validCount === 1
                ? 'Solo hay un punto; hacen falta dos respuestas consecutivas para trazar una línea.'
                : 'Los cortes indican intentos sin respuesta válida.'}
            </Text>
            <Svg
              viewBox="0 0 300 165"
              width="100%"
              height={165}
              accessibilityLabel={`Serie temporal de ${label}`}
            >
              <Line x1="40" y1="20" x2="40" y2="135" stroke="#58677D" />
              <Line x1="40" y1="135" x2="280" y2="135" stroke="#58677D" />
              <SvgText x="2" y="32" fontSize="10" fill="#19283F">
                {max.toFixed(1)}
              </SvgText>
              <SvgText x="20" y="135" fontSize="10">
                0
              </SvgText>
              {segments.map((points, i) => (
                <Polyline
                  key={i}
                  points={points.join(' ')}
                  fill="none"
                  stroke="#245BD6"
                  strokeWidth="2"
                />
              ))}
              {samples
                .filter(row => value(row) != null)
                .map(row => (
                  <Circle
                    key={row.id}
                    cx={x(row)}
                    cy={y(row)}
                    r="3"
                    fill="#245BD6"
                  />
                ))}
              <SvgText x="40" y="155" fontSize="10">
                {new Date(start).toLocaleTimeString()}
              </SvgText>
              <SvgText x="280" y="155" fontSize="10" textAnchor="end">
                +{(span / 1000).toFixed(1)} s
              </SvgText>
            </Svg>
          </View>
        );
      })}
    </View>
  );
}
