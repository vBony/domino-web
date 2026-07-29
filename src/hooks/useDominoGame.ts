import { RefObject, useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { PHASER_GAME_CONFIG } from "@config/gameConfig";
import { SCENE_KEYS } from "@config/sceneKeys";
import type {
  MoveHistoryEntry,
  TableGameInfo,
  TableIdentity,
  TableLayoutRects,
  TableScene,
  TableSeatPlayer
} from "@scenes/TableScene";

const MAX_MOVE_HISTORY = 50;

const DEFAULT_GAME_INFO: TableGameInfo = { currentPlayerName: null, boneyardCount: 0 };

export interface DominoGameState {
  containerRef: RefObject<HTMLDivElement | null>;
  tableLabel: string | null;
  players: TableSeatPlayer[];
  moveHistory: MoveHistoryEntry[];
  gameInfo: TableGameInfo;
  layoutRects: TableLayoutRects | null;
}

// Dono do ciclo de vida do Phaser.Game: cria/destroi a instancia e traduz os
// eventos de bridge que TableScene emite (ver scenes/TableScene.ts) em
// estado React puro, pra GameCanvas/TableSeatsOverlay/TableHeader/
// GameInfoCard/MoveHistoryCard consumirem sem tocar em Phaser diretamente.
export function useDominoGame(nickname: string): DominoGameState {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tableLabel, setTableLabel] = useState<string | null>(null);
  const [players, setPlayers] = useState<TableSeatPlayer[]>([]);
  const [moveHistory, setMoveHistory] = useState<MoveHistoryEntry[]>([]);
  const [gameInfo, setGameInfo] = useState<TableGameInfo>(DEFAULT_GAME_INFO);
  const [layoutRects, setLayoutRects] = useState<TableLayoutRects | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setTableLabel(null);
    setPlayers([]);
    setMoveHistory([]);
    setGameInfo(DEFAULT_GAME_INFO);
    setLayoutRects(null);

    const game = new Phaser.Game({ ...PHASER_GAME_CONFIG, parent: container });
    // Lido por BootScene.create() pra pular direto pra TableScene - ver
    // scenes/BootScene.ts.
    game.registry.set("initialNickname", nickname);

    let disposed = false;
    let detachSceneEvents: (() => void) | null = null;

    game.events.once(Phaser.Core.Events.READY, () => {
      // React em StrictMode (dev) roda este effect duas vezes (monta,
      // desmonta, monta de novo); se o cleanup ja rodou antes do Phaser
      // terminar de bootar, nao assina eventos numa Scene de um Game ja
      // destruido.
      if (disposed) return;

      const scene = game.scene.getScene(SCENE_KEYS.Table) as TableScene;

      const onIdentity = (identity: TableIdentity) => {
        setTableLabel(`Mesa #${identity.roomId.slice(-4).toUpperCase()}`);
      };
      const onLayout = (rects: TableLayoutRects) => setLayoutRects(rects);
      const onPlayers = (nextPlayers: TableSeatPlayer[]) => setPlayers(nextPlayers);
      const onGameInfo = (info: TableGameInfo) => setGameInfo(info);
      const onMoveHistory = (entry: MoveHistoryEntry) =>
        setMoveHistory((prev) => [...prev, entry].slice(-MAX_MOVE_HISTORY));

      scene.events.on("identityResolved", onIdentity);
      scene.events.on("layoutChanged", onLayout);
      scene.events.on("playersChanged", onPlayers);
      scene.events.on("gameInfoChanged", onGameInfo);
      scene.events.on("moveHistoryEntry", onMoveHistory);

      detachSceneEvents = () => {
        scene.events.off("identityResolved", onIdentity);
        scene.events.off("layoutChanged", onLayout);
        scene.events.off("playersChanged", onPlayers);
        scene.events.off("gameInfoChanged", onGameInfo);
        scene.events.off("moveHistoryEntry", onMoveHistory);
      };
    });

    return () => {
      disposed = true;
      detachSceneEvents?.();
      game.destroy(true);
    };
  }, [nickname]);

  return { containerRef, tableLabel, players, moveHistory, gameInfo, layoutRects };
}
