// Flag global do modo local (sem backend/websocket).
// Quando true: NetworkService usa implementacoes mockadas e os 4 assentos
// sao controlados localmente, para validar UI/UX antes da integracao real.
// Quando false: NetworkService deve se comunicar via WebSocket (Socket.IO).
// Controlada via VITE_LOCAL_MODE no .env (ver .env.example).
export const LOCAL_MODE = import.meta.env.VITE_LOCAL_MODE !== "false";
