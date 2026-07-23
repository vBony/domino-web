type Listener<Args extends unknown[]> = (...args: Args) => void;

// Emissor de eventos generico e tipado, sem depender de Phaser.Events.
// Reutilizado por GameManager, TimerService e ChatService para notificar
// assinantes sem acoplar quem emite a quem escuta.
export class EventEmitter<EventMap extends Record<string, unknown[]>> {
  private listeners: { [K in keyof EventMap]?: Set<Listener<EventMap[K]>> } = {};

  on<K extends keyof EventMap>(event: K, listener: Listener<EventMap[K]>): void {
    const set = this.listeners[event] ?? new Set();
    set.add(listener);
    this.listeners[event] = set;
  }

  off<K extends keyof EventMap>(event: K, listener: Listener<EventMap[K]>): void {
    this.listeners[event]?.delete(listener);
  }

  emit<K extends keyof EventMap>(event: K, ...args: EventMap[K]): void {
    this.listeners[event]?.forEach((listener) => listener(...args));
  }
}
