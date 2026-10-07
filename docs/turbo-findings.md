# Turbo.cr — resultados del spike

Fecha de implementación: 2026-10-07.

## Estado

El spike está preparado para medir una URL real de vídeo con:

npx tsx scripts/probe-video.ts <url>

El script hace HEAD, dos GET con Range, repite HEAD y GET con un Referer de otro origen, sigue redirecciones y registra status, Accept-Ranges, Content-Type, Content-Length, Content-Range, CORS, cache y cookies. Guarda el último resultado en docs/turbo-probe-latest.json.

La prueba de navegador está en public/probe.html. Se abre con:

/probe.html?url=<URL-encoded-video-url>

y registra loadedmetadata, reproducción, buffering, errores y un seek al 50%.

## Matriz de evidencia

| Pregunta | Estado | Evidencia |
|---|---|---|
| ¿La URL directa devuelve vídeo? | **NO VERIFICADO** | Falta ejecutar el probe con una URL real de vídeo. |
| ¿Soporta Range/seek? | **NO VERIFICADO** | El script verifica ambos rangos y Content-Range; no se ha medido una URL concreta. |
| ¿Acepta hotlink desde otro dominio? | **NO VERIFICADO** | El probe repite las peticiones con Referer: https://example.invalid/. |
| ¿Hay URL firmada/caducidad? | **NO VERIFICADO** | Se registra Cache-Control, Expires y la URL final; hace falta repetir la prueba tras el intervalo adecuado. |
| ¿Cuál es el host real del vídeo? | **NO VERIFICADO** | Se conserva la URL final después de redirects en turbo-probe-latest.json. |
| ¿CORS? | **NO VERIFICADO / NO NECESARIO PARA <video>** | El reproductor no usa fetch ni canvas; CORS solo sería necesario para esos accesos programáticos. |
| ¿referrerpolicy="no-referrer" funciona como mitigación? | **NO VERIFICADO** | probe.html lo establece explícitamente; requiere prueba en navegador real. |

## Evidencia previa documentada

La especificación ya recoge que Turbo.cr declara MP4/MOV/M4V/MPG, un límite actual de 750 MB, acceso por enlace directo o embed, posibles verificaciones anti-bot en páginas de descarga, páginas /embed/ID y restricciones contra saltarse límites o automatizar descargas.

Estas afirmaciones son contexto previo de la especificación, no resultados producidos por este spike.

## Decisión

**Decisión provisional: no implementar todavía el reproductor directo.**

El TICKET-002 debe cerrarse con una URL real que demuestre 200/206, Content-Type: video/mp4 y Range/seek. Hasta entonces:

1. El código del reproductor no debe asumir que Turbo.cr entrega un MP4 reproducible.
2. Si la URL directa falla pero /embed/ID funciona, el plan B es iframe/embed.
3. Si ambos fallan de forma no compatible con la arquitectura, se cambia de host manteniendo las URLs como datos del catálogo.

La decisión definitiva debe actualizarse aquí después de ejecutar el probe en un vídeo real y probar probe.html en un móvil.
