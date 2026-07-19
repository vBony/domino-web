// URL HTTP base do domino-server (auth REST + matchmaking Colyseus), usada
// apenas quando LOCAL_MODE=false. Ver .env.example.
export const SERVER_HTTP_URL: string = import.meta.env.VITE_SERVER_URL ?? "http://localhost:3333";

// Colyseus fala WebSocket na mesma origem do HTTP - so troca o protocolo.
export const SERVER_WS_URL: string = SERVER_HTTP_URL.replace(/^http/, "ws");
