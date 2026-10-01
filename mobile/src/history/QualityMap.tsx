import React, { useMemo, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import assets from './vendor/mapAssets.json';
import { HistoryRow } from './model';
import { panelStyles } from './MonitorCard';

export function QualityMap({
  rows,
  threshold,
}: {
  rows: HistoryRow[];
  threshold: number;
}) {
  const [error, setError] = useState(false);
  const points = useMemo(
    () =>
      rows
        .filter(
          row =>
            row.kind === 'latency' &&
            row.data.status === 'ok' &&
            row.data.rttMs != null &&
            row.data.location.status === 'ok',
        )
        .map(row => [
          row.data.location.latitude!,
          row.data.location.longitude!,
          row.data.rttMs!,
          row.data.location.accuracyM ?? 0,
        ])
        .filter(
          point =>
            point.every(Number.isFinite) &&
            Math.abs(point[0]) < 85.05 &&
            Math.abs(point[1]) <= 180,
        ),
    [rows],
  );
  const html = useMemo(
    () => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src https://tile.openstreetmap.org data:; connect-src 'none';"><style>${
      assets.css
    }html,body,#map{height:100%;margin:0}.leaflet-control-attribution{font-size:10px}</style></head><body><div id="map"></div><script>${
      assets.js
    }\n${assets.heat}\n
    const points=${JSON.stringify(points)}, threshold=${Math.max(1, threshold)};
    const map=L.map('map');
    const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
    tiles.on('tileerror',()=>window.ReactNativeWebView.postMessage('tileError'));
    if(points.length){
      map.fitBounds(points.map(p=>[p[0],p[1]]),{maxZoom:16,padding:[20,20]});
      L.heatLayer(points.map(p=>[p[0],p[1],Math.min(1,p[2]/threshold)]),{radius:22,blur:15,max:1,maxZoom:16,gradient:{0.2:'#245bd6',0.5:'#e5c442',1:'#d83c35'}}).addTo(map);
      points.forEach(p=>{const text=document.createElement('span');text.textContent=p[2].toFixed(1)+' ms · precisión ±'+p[3].toFixed(0)+' m';L.circleMarker([p[0],p[1]],{radius:3,color:'#19283f',weight:1,fillOpacity:0.4}).bindPopup(text).addTo(map)});
    }
    document.addEventListener('click',event=>{const a=event.target.closest('a');if(a){event.preventDefault();window.ReactNativeWebView.postMessage(a.href)}});
  </script></body></html>`,
    [points, threshold],
  );
  if (!points.length)
    return (
      <Text style={panelStyles.text}>
        No hay muestras de RTT con ubicación reciente para estos filtros.
        Habilitá ubicación antes de medir.
      </Text>
    );
  return (
    <View>
      <Text style={panelStyles.text}>
        Calor de RTT: azul menor demora, rojo mayor demora. Referencia:{' '}
        {threshold} ms. La densidad de muestras también aumenta el calor; tocá
        un punto para ver su valor y precisión.
      </Text>
      <WebView
        style={styles.map}
        source={{ html, baseUrl: 'https://network-qos.local/' }}
        userAgent="NetworkQoSMonitor/1.0 (Android; university QoS project)"
        originWhitelist={['https://network-qos.local', 'about:blank']}
        javaScriptEnabled
        domStorageEnabled={false}
        mixedContentMode="never"
        allowFileAccess={false}
        onShouldStartLoadWithRequest={request =>
          request.url === 'about:blank' ||
          request.url.startsWith('https://network-qos.local/')
        }
        onMessage={event => {
          const message = event.nativeEvent.data;
          if (message === 'tileError') setError(true);
          if (
            message === 'https://www.openstreetmap.org/copyright' ||
            message === 'https://leafletjs.com'
          )
            Linking.openURL(message).catch(() => setError(true));
        }}
        onError={() => setError(true)}
      />
      {error && (
        <Text style={panelStyles.text}>
          No se pudo cargar parte del mapa. Revisá Internet; las mediciones
          permanecen guardadas.
        </Text>
      )}
      <Text style={panelStyles.text}>
        Mapa © OpenStreetMap contributors. Requiere Internet; no descarga mapas
        para uso sin conexión.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({ map: { height: 340 } });
