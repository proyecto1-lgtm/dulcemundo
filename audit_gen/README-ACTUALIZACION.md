# Dulce Mundo – corrección de tarjetas y música

## Cambios
- Las tarjetas sorpresa se guardan en `game.rewardQueue` en el servidor y el cliente las muestra una por una. Así no se pierde una tarjeta si un movimiento recoge más de un caramelo.
- Baraja de 20 tarjetas por partida, sin repetición: 4 juega otra vez, 5 de +5 puntos, 2 de +10, 1 de +15, 6 sin regalo y 2 de -5 puntos.
- Música instrumental original en `public/audio/dulce-mundo-melodia.wav`.
- La música se inicia al pulsar **Activar música**. Esto es necesario porque los navegadores bloquean el audio automático hasta que el usuario interactúa con la página.
- Control de volumen y pausa.

## Publicación
1. Copia los archivos del ZIP sobre el proyecto existente, conservando `.env` locales.
2. En PowerShell, desde la raíz del proyecto, ejecuta `npm install` y `npm run build`.
3. Sube los cambios: `git add .`, `git commit -m "Corrige tarjetas sorpresa y agrega música"`, `git push origin main`.
4. En Render despliega primero `dulcemundo-server` y luego `dulcemundo` (Static Site). Ambos deben usar el mismo commit.
5. Abre el juego, pulsa **Activar música** y recoge un caramelo para probar la tarjeta.

La música no se reproduce automáticamente al abrir la web porque Chrome/Edge bloquean el autoplay con sonido. El usuario debe pulsar el control una vez.
