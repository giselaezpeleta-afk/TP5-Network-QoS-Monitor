# Prueba de latencia en el A55

## Instalar al volver a la misma red

1. Conectar PC y teléfono al mismo Wi-Fi. Activar Depuración inalámbrica.
2. Si ADB no detecta el A55 automáticamente, tomar «Dirección IP y puerto» de la
   pantalla principal de Depuración inalámbrica, sin entrar a vincular con código.
3. Desde la raíz del proyecto, ejecutar:

```powershell
.\scripts\install-standalone.ps1
# Si necesita reconectarse, usar la dirección real mostrada por el teléfono:
.\scripts\install-standalone.ps1 -Address '<IP:puerto>'
```

El APK conserva la firma local de pruebas y se instala sobre la versión anterior.
No requiere Metro. La instalación real de esta nueva etapa está pendiente.

## Comparar Wi-Fi y datos móviles

1. En Inicio, desplazarse hasta **Medir latencia**.
2. Mantener los tres destinos iniciales en TCP, puerto 53.
3. Tocar **Iniciar medición** y esperar que cada destino llegue a 10/10 sondas.
4. Anotar o capturar RTT mínimo, promedio, máximo, jitter y sondas fallidas.
5. Apagar Wi-Fi, dejar datos móviles activos y repetir el ensayo.

Un RTT menor significa que esa conexión se estableció más rápido. Jitter bajo
indica menor variación entre muestras consecutivas; no indica por sí solo que
la conexión tenga buena velocidad. No hay umbrales de calidad inventados.
Un guion significa datos insuficientes. Los fallos TCP no son un porcentaje
de pérdida de paquetes.

## Interrupciones

- Cancelar a mitad de una serie: deben conservarse resultados parciales.
- Cambiar Wi-Fi/datos durante una serie: debe detenerse, sin mezclar redes.
- Salir de la app durante una serie: debe detenerse. Esta etapa no es background.
- Sin conectividad: debe avisar que se necesita una red.
- Ingresar un puerto inválido o un host vacío: debe avisar antes de enviar sondas.

## Eco UDP propio

Seguir `backend/README.md`: iniciar el servidor en la IP LAN real de la PC y
configurar uno de los tres destinos con esa IP, puerto 5051 y modo UDP. Los otros
dos pueden permanecer en TCP. No usar los servidores DNS públicos como eco UDP.

La PC debe ser alcanzable y el firewall debe permitir el puerto UDP de prueba.
No se cambian reglas automáticamente. En 4G la IP privada de la PC no sirve.
El porcentaje sin eco es ausencia de respuesta dentro del plazo; un servidor
apagado o una respuesta tardía pueden producir el mismo síntoma que una pérdida.

Los resultados todavía no se guardan en historial persistente: registrar las
capturas antes de iniciar otra serie o cerrar la app. GPS e historial son etapas
posteriores del TP.
