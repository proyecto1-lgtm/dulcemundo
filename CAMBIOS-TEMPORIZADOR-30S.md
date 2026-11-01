# Ajuste del temporizador de Dulce Mundo

- Cada turno dispone de 30 segundos.
- Al quedar disponible el turno del jugador, el cliente avisa al servidor cuando ya terminó la animación y se cerraron las tarjetas sorpresa.
- Desde ese aviso hay 4 segundos de preparación antes de iniciar la cuenta regresiva de 30 segundos.
- El servidor controla el plazo y cambia automáticamente al siguiente jugador cuando vence.
- El temporizador se reinicia cuando el jugador obtiene otro turno, incluido el efecto de una tarjeta sorpresa.
- El temporizador se pausa durante una desconexión y se reanuda al recuperar la partida, dentro del período de reconexión configurado.

Nota: la recuperación de partidas continúa dependiendo de que el proceso del servidor permanezca activo; el estado de las salas se mantiene en memoria.
