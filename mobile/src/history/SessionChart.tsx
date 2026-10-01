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
        ? `${row.data.target?.host}:${row.data.target?.port} · RTT ms`
        : `${row.data.direction === 'download' ? 'Descarga' : 'Subida'} · Mbps`;
    series.set(label, [...(series.get(label) ?? []), row]);
  }
  return (
    <View>
      {[...series].map(([label, samples]) => {
        const value = (row: HistoryRow) =>
          row.kind === 'latency' ? row.data.rttMs : row.data.mbps;
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
