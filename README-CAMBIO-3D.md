# Dulce Mundo – personajes 3D con animación de caminata

## Cambio realizado
- Se sustituyeron los emojis planos de los personajes del tablero por modelos 3D construidos con geometrías de Three.js.
- Se añadieron rasgos diferenciados para Conejito, Leoncito, Panda, Zorrito, Elefantito y Tortuguita.
- Cuando el servidor actualiza la posición de un jugador, el personaje interpola el recorrido entre casillas y anima sus cuatro patas, con un pequeño rebote corporal.
- Al terminar el recorrido, el personaje queda en la casilla de destino.

## Aplicación
Este cambio conserva la lógica del tablero, el motor de juego, el backend y la sincronización Socket.IO. Solo modifica `src/components/Board3D.jsx`.

## Publicación
1. Haz una copia de seguridad del proyecto actual.
2. Extrae este ZIP sobre la carpeta del proyecto, reemplazando los archivos.
3. En PowerShell ejecuta `npm install` y luego `npm run build`.
4. Si la compilación termina correctamente, ejecuta `git add .`, `git commit -m "Agrega personajes 3D con animación de caminata"` y `git push origin main`.
5. Espera el despliegue en Render y prueba una partida con ambos jugadores.

Nota: la compilación no pudo verificarse en el entorno de preparación porque el ZIP contiene dependencias nativas de Vite/Rolldown para otro sistema operativo. Debe ejecutarse `npm install` en Windows antes de compilar.
