import { EventEmitter } from "@utils/EventEmitter";
import { NetworkService, ChatMessageDTO } from "@network/NetworkService";

export interface ChatServiceEvents extends Record<string, unknown[]> {
  messageReceived: [ChatMessageDTO];
}

// Guarda o historico de mensagens da sala e escuta o NetworkService para
// mensagens vindas de outros jogadores. So estrutura por enquanto - nao
// ha metodo de envio via rede ainda porque o contrato NetworkService.sendChat
// sera definido junto do backend real (ver comentario em sendMessage).
export class ChatService {
  readonly events = new EventEmitter<ChatServiceEvents>();
  private readonly messages: ChatMessageDTO[] = [];

  constructor(networkService: NetworkService) {
    networkService.receiveChat((message) => this.handleIncoming(message));
  }

  async sendMessage(playerId: string, text: string): Promise<void> {
    // Integracao futura: NetworkService.sendChat(message) quando o contrato
    // do backend for definido. Por enquanto (LOCAL_MODE), ecoa localmente.
    const message: ChatMessageDTO = { playerId, text, sentAt: Date.now() };
    this.handleIncoming(message);
  }

  getHistory(): readonly ChatMessageDTO[] {
    return this.messages;
  }

  private handleIncoming(message: ChatMessageDTO): void {
    this.messages.push(message);
    this.events.emit("messageReceived", message);
  }
}
