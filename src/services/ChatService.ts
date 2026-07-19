import { EventEmitter } from "@utils/EventEmitter";
import { NetworkService, ChatMessageDTO } from "@network/NetworkService";

export interface ChatServiceEvents extends Record<string, unknown[]> {
  messageReceived: [ChatMessageDTO];
}

// Guarda o historico de mensagens da sala e escuta o NetworkService para
// mensagens vindas de outros jogadores. O servidor ainda nao implementa um
// canal de chat de verdade (sendChat e um no-op no ColyseusNetworkService
// por enquanto), entao o echo local garante que a propria mensagem sempre
// aparece na UI independente do backend.
export class ChatService {
  readonly events = new EventEmitter<ChatServiceEvents>();
  private readonly messages: ChatMessageDTO[] = [];

  constructor(private readonly networkService: NetworkService) {
    networkService.receiveChat((message) => this.handleIncoming(message));
  }

  async sendMessage(playerId: string, text: string): Promise<void> {
    const message: ChatMessageDTO = { playerId, text, sentAt: Date.now() };
    this.handleIncoming(message);
    await this.networkService.sendChat(text);
  }

  getHistory(): readonly ChatMessageDTO[] {
    return this.messages;
  }

  private handleIncoming(message: ChatMessageDTO): void {
    this.messages.push(message);
    this.events.emit("messageReceived", message);
  }
}
