DULCE MUNDO — TEMPORIZADOR Y RECONEXIÓN

Cambios:
- Temporizador de 15 segundos por turno, visible para ambos jugadores.
- El servidor controla el tiempo; al agotarse, el jugador pierde el turno.
- El tiempo empieza cuando el turno queda listo para jugar, después de las animaciones y tarjetas pendientes.
- Si el jugador actualiza la página o se desconecta, puede volver con un token guardado en localStorage.
- La partida espera hasta 120 segundos para que el jugador vuelva.
- Al reconectarse, recupera la sala y el estado actual de la partida.
- El tiempo del turno se pausa mientras falta un jugador y continúa al reconectarse.

LÍMITES:
- La recuperación funciona mientras el proceso del servidor de Render siga activo.
- Si Render reinicia o despliega una nueva versión del servidor, las salas en memoria se pierden.
- Para sobrevivir a reinicios del servidor hace falta almacenamiento persistente en Render; no se usa Supabase.

Para actualizar:
1. Reemplazar los archivos del proyecto con los del ZIP.
2. Ejecutar npm install
3. Ejecutar npm run build
4. git add .
5. git commit -m "Agregar temporizador de 15 segundos y reconexion"
6. git push origin main
