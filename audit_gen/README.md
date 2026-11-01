# Dulce Mundo Online — prototipo multijugador

## Requisitos
Node.js 20+ y npm.

## Instalación
```bash
npm install
```

## Ejecutar en desarrollo (dos terminales)
Terminal 1:
```bash
npm run server
```
Terminal 2:
```bash
npm run dev
```
Abre la URL de Vite. Para probar dos jugadores, abre dos navegadores o ventanas privadas y busca partida desde ambos.

También puedes ejecutar ambos procesos con:
```bash
npm run dev:online
```

## Servidor
- Express + Socket.IO.
- Endpoint de salud: `http://localhost:8787/health`.
- Cola de emparejamiento.
- Espera máxima de 30 segundos.
- Si no hay rival, empareja con Dulce IA.
- El servidor genera el dado, valida movimientos y mantiene el estado autoritativo de la partida.
- Sin base de datos: las partidas viven en memoria y se pierden al reiniciar el servidor.

## Publicar en Render
1. Sube el proyecto a un repositorio GitHub.
2. Crea un servicio Web Service en Render.
3. Build command: `npm install`.
4. Start command: `npm run server`.
5. Define `PORT` si Render lo solicita (normalmente Render lo proporciona).
6. En el despliegue del frontend, configura `VITE_SERVER_URL` con la URL HTTPS del servidor Render, por ejemplo `https://tu-servicio.onrender.com`.
7. Vuelve a compilar y publicar el frontend.

## Limitaciones de esta versión
- Los animales son emojis y figuras 3D provisionales; falta integrar modelos GLB/GLTF.
- La IA es básica.
- No hay cuentas persistentes, historial ni panel docente todavía.
- Las partidas y cola se guardan en memoria; para escalar a múltiples instancias se necesitaría Redis/adaptador Socket.IO.
- La escena 3D es una primera representación funcional, no el arte final.


## Correcciones de esta versión
- El estado enviado por Socket.IO serializa las monedas como arreglo, evitando errores al dibujar el tablero en el navegador.
- La cámara 3D permanece fija, sin rotación ni zoom interactivo.
- La cámara se orienta desde el lado de cada jugador: el jugador azul ve su esquina inicial desde su lado y el rojo ve la suya.
- Los personajes se muestran como sprites de animales sobre el tablero.
- Mensaje de conexión más claro cuando el servidor no está iniciado.

## Importante al probar localmente
La interfaz `npm run dev` no inicia el servidor multijugador. Debes abrir DOS terminales dentro de la carpeta del proyecto:
1. `npm run server`
2. `npm run dev`

La terminal del servidor debe mostrar `Dulce Mundo online server listening on 8787`.
Puedes verificarlo abriendo `http://localhost:8787/health`; debe responder con `{"status":"ok","service":"dulce-mundo-server"}`.

## Actualización de orientación e interacción
- Cámara situada detrás de la esquina inicial del jugador, mirando diagonalmente hacia la meta.
- Encuadre inicial más cercano y seguimiento del personaje cuando se mueve.
- Guía punteada desde la salida hasta la meta y etiquetas TU SALIDA / META.
- Las direcciones que acercan al centro se resaltan en verde y se identifican como “Hacia meta”.
- Se mantiene cámara sin rotación libre; arrastrar desplaza la vista y la rueda controla el zoom.

## Vista cenital tipo tablero de damas
- Cámara ortográfica directamente encima del tablero, sin inclinación ni perspectiva isométrica.
- Cuadrícula alineada con la pantalla: filas horizontales y columnas verticales.
- Misma orientación de tablero para ambos jugadores; fila inicial azul arriba y roja abajo.
- Se elimina el desplazamiento manual y el zoom para mantener una referencia visual estable y sencilla para niños de 3 años.
- Se conserva la flecha flotante sobre cada animal para indicar su orientación.

## Actualización: orientación al centro, monedas cenitales y rocas
- Ambos personajes comienzan con su flecha apuntando diagonalmente hacia el centro del tablero.
- Después de moverse, la flecha indica la dirección de su último desplazamiento.
- Las monedas son discos horizontales con borde y centro visible desde la cámara cenital.
- Se añadieron 12 rocas tridimensionales en casillas fijas y simétricas.
- Las rocas bloquean el paso: el servidor rechaza rutas que intenten atravesarlas y la IA también las evita.
- La ubicación de rocas y monedas es igual para todos los participantes de una partida.

## Perspectiva individual por jugador (estilo MOBA)
- Cada cliente muestra su propio personaje en el borde inferior y al rival en el borde superior.
- El tablero mantiene la cuadrícula recta y cenital; solo cambia la orientación de la cámara según el jugador.
- La cámara del jugador 1 rota 180 grados; la del jugador 2 mantiene la orientación base.
- Los símbolos y nombres de las flechas de movimiento se adaptan a la perspectiva local para que ↑ siempre signifique avanzar hacia el centro desde la pantalla del jugador.
- El estado compartido, las posiciones, monedas, rocas y territorios siguen usando las mismas coordenadas del servidor.

## Ajuste de controles y nombre del turno
- Los cuatro controles aparecen siempre en el mismo orden en ambas pantallas: arriba, abajo, izquierda, derecha.
- Los botones se traducen a las coordenadas reales de cada perspectiva, por lo que la flecha hacia arriba siempre avanza hacia la meta.
- Arriba del tablero y en el panel de controles se muestra “Turno de [nombre]”, tanto para el jugador local como para su rival.

## Nueva condición de finalización: recoger todas las monedas
- La partida ya no termina al llegar al centro; el centro deja de ser una meta.
- Se eliminó el objeto decorativo de meta del tablero y su leyenda.
- Se eliminaron todas las rocas y obstáculos del tablero y de la validación del servidor.
- Los caminos quedan libres; solo se mantienen los límites del tablero y la regla de no ocupar la misma casilla que el rival.
- La partida termina cuando el conjunto de monedas queda vacío.
- Puntuación final: 5 puntos por moneda recogida y 1 punto por casilla conquistada.
- Gana quien tenga más puntos; si los puntajes son iguales, el resultado es empate.
- La pantalla final muestra los puntajes de ambos jugadores.

## Vista previa del recorrido al programar flechas
- El tablero recibe la secuencia de flechas que el jugador está seleccionando antes de ejecutarla.
- Cada casilla del recorrido provisional se resalta en verde y se conecta con una línea verde.
- La vista previa se actualiza inmediatamente al agregar o deshacer una flecha.
- El recorrido parte de la posición actual del animal y no modifica el estado del servidor ni conquista casillas hasta pulsar Ejecutar.
- Se añade la leyenda “Camino previsto” y una indicación para que el estudiante pueda revisar su recorrido antes de confirmarlo.

## Dulces aleatorios por partida
- En cada nueva partida el servidor genera 20 dulces en ubicaciones aleatorias.
- Entre dos dulces se mantienen al menos dos casillas vacías en cualquier dirección (distancia de Chebyshev superior a 2).
- Se excluyen las esquinas iniciales de los jugadores para no bloquear sus salidas.
- Los antiguos modelos de monedas se sustituyen por caramelos de colores con envoltura.
- La separación se calcula en el servidor, por lo que todos los participantes de la misma partida reciben exactamente la misma distribución.

## Corrección de aleatoriedad por encuentro
- Cada sala nueva llama a createGame() y genera un candyLayoutId diferente.
- Se elimina cualquier distribución de posiciones fijas como fallback.
- Se vuelve a sortear la distribución completa hasta lograr 20 dulces.
- La separación mínima se valida con distancia Chebyshev >= 3: quedan al menos dos casillas libres entre dulces, incluso en diagonal.
- El servidor registra el identificador y las coordenadas de cada nueva distribución para comprobar que cambian entre encuentros.
- Ambos jugadores reciben el mismo tablero porque la distribución se genera una sola vez al crear la sala.


## Actualización de juego: cartas sorpresa, turnos extra, IA y música

- Al recoger caramelos se extraen cartas de una baraja aleatoria de 20, sin repetición.
- Los dados 1 y 6 conceden otro lanzamiento después de completar el movimiento.
- La carta «¡Juega otra vez!» también concede un lanzamiento adicional.
- La IA tiene dificultades fácil, intermedia y experta.
- La música instrumental se sintetiza en el navegador y dispone de control de volumen/silencio.
- En Render, mantener `VITE_SERVER_URL=https://dulcemundo-server.onrender.com` en el Static Site.
- Para publicar: subir estos cambios a GitHub y desplegar nuevamente el Static Site y el Web Service.
