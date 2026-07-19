// Flag global do modo local (sem backend/websocket).
// Quando true: NetworkService usa implementacoes mockadas e os 4 assentos
// sao controlados localmente, para validar UI/UX sem depender do servidor.
// Quando false: NetworkService fala com o domino-server via Colyseus
// (ColyseusNetworkService), que e a unica autoridade sobre o jogo.
// Controlada via VITE_LOCAL_MODE no .env (ver .env.example).
export const LOCAL_MODE = import.meta.env.VITE_LOCAL_MODE !== "false";
