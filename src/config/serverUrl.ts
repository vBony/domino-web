// URL do backend (Socket.IO), usada apenas quando LOCAL_MODE=false. Ainda
// nao ha backend real - isto existe para a NetworkService real (futura)
// ler de um unico lugar em vez de hardcodar a URL. Ver .env.example.
export const SERVER_URL = import.meta.env.VITE_SERVER_URL;
