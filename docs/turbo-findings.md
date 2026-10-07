# Turbo.cr — verificación de reproducción

Estado de la evidencia para TICKET-1.

## Cómo reproducir la prueba

Con una URL directa real de un vídeo autorizado:

```bash
npx tsx scripts/probe-video.ts "https://turbo.cr/....mp4"
```

La sonda ejecuta:

1. `HEAD`
2. `GET` con `Range: bytes=0-1`
3. `GET` con `Range: bytes=1000000-1000100`

Registra status, redirecciones, `Accept-Ranges`, `Content-Type`, `Content-Length`,
CORS, cookies y `Referrer-Policy`.

## Resultado

| Pregunta | Estado | Evidencia |
|---|---|---|
| ¿La URL directa devuelve MP4? | **NO VERIFICADO** | No hay una URL de vídeo real proporcionada en el repositorio. |
| ¿Soporta Range / 206? | **NO VERIFICADO** | Requiere ejecutar la sonda contra una URL real. |
| ¿Permite seek? | **NO VERIFICADO** | Requiere reproducción en un móvil real y arrastre del seek. |
| ¿Hotlink / Referer? | **NO VERIFICADO** | La sonda registra la política, pero no demuestra por sí sola todos los controles del host. |
| ¿Hay caducidad del enlace? | **NO VERIFICADO** | Requiere observar una URL real durante su vida útil. |
| ¿Cookies son necesarias? | **NO VERIFICADO** | No se han observado cabeceras de una URL real. |

## Decisión

**No se inventa una confirmación.** La implementación queda preparada para reproducción directa mediante
`<video src>`, pero TICKET-1 no puede declararse completamente verificado hasta disponer de una URL real.

Si la prueba real confirma `Content-Type: video/mp4`, `Accept-Ranges: bytes` y respuestas `206`
sin cookies/Referer obligatorio, se mantiene el reproductor directo.

Si falla, el plan B especificado es usar `/embed/ID` mediante iframe. Si el embed tampoco es estable,
se cambia de host sin modificar el modelo de catálogo (la URL sigue siendo un string).

> Solo deben probarse y alojarse vídeos para los que tengas los derechos o autorización correspondientes.
