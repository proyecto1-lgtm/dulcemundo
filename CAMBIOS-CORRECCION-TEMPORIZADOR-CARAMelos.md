# Correcciones del temporizador y recogida de caramelos

- El servidor vuelve a garantizar el inicio del temporizador al lanzar el dado si no existe una fecha límite activa.
- La interfaz evita mostrar 0 s durante el último segundo mientras el servidor procesa el vencimiento.
- Cada movimiento registra las coordenadas de los caramelos recogidos.
- El tablero mantiene visibles esos caramelos durante la caminata y los retira al llegar el personaje a cada casilla.
- Las tarjetas de recompensa recibidas en un movimiento se muestran en una cola secuencial. Si recoge dos caramelos, se muestran dos tarjetas.
- Se limpia la lista visual de caramelos recogidos al iniciar el siguiente lanzamiento/turno.

Verificación pendiente: ejecutar `npm install` y `npm run build` en el entorno del proyecto y probar una partida real con ambos jugadores.
