import Phaser from "phaser";
import { SCENE_KEYS } from "@config/sceneKeys";
import { Player } from "@engine/Player";
import { DominoPiece } from "@engine/DominoPiece";
import { MoveSide } from "@engine/MoveValidator";
import { BoardLayout } from "@engine/BoardLayout";
import { CameraBounds } from "@engine/CameraBounds";
import { GameManager, TimelineEvent } from "@managers/GameManager";
import { LayoutManager, OpponentSlot, Rect, VisualSlot } from "@managers/LayoutManager";
import { ColyseusNetworkService } from "@network/ColyseusNetworkService";
import { NetworkService } from "@network/NetworkService";
import { RoundResult, WIN_BONUS_POINTS, WinReason } from "@engine/WinnerCalculator";
import { DominoPieceView } from "@objects/DominoPieceView";
import { OpponentSeatView } from "@objects/OpponentSeatView";
import { LocalHandView } from "@objects/LocalHandView";
import { TimelinePanelView } from "@objects/TimelinePanelView";
import { SideChoiceView } from "@objects/SideChoiceView";

const PIECE_LENGTH = 64;
const PIECE_WIDTH = 32;
const OPPONENT_SLOTS: readonly OpponentSlot[] = ["top", "left", "right"];

// Como cada tipo de vitoria e descrito na frase do alerta de fim de rodada
// (ver handleRoundEnded) - so texto de apresentacao, os pontos vem de
// WIN_BONUS_POINTS.
const WIN_REASON_PHRASES: Record<WinReason, string> = {
  gabuada: "com uma GABUADA",
  "double-ended": "fechando as duas pontas",
  double: "batendo com a bucha",
  common: ""
};

// Dados recebidos via scene.start(SCENE_KEYS.Table, data) - a MenuScene e
// quem coleta o nome do jogador agora (window.prompt saiu).
interface TableSceneData {
  nickname?: string;
}

// Scene principal: orquestra GameManager (estado/eventos), LayoutManager
// (posicoes responsivas) e as views (DominoPieceView/OpponentSeatView/
// LocalHandView). Nao decide regra de jogo nem calcula layout - so aplica
// o que essas camadas ja calcularam.
//
// Esta Scene primeiro resolve uma identidade (guest login + join na sala
// Colyseus) antes de montar a mesa - ver setupOnlineGame(). O servidor
// autoritativo (DominoRoom) e a unica fonte de verdade do jogo.
export class TableScene extends Phaser.Scene {
  private readonly layoutManager = new LayoutManager();
  private readonly boardLayout = new BoardLayout({
    pieceLength: PIECE_LENGTH,
    pieceWidth: PIECE_WIDTH,
    maxSegmentLength: 480
  });
  private readonly cameraBounds = new CameraBounds({ minZoom: 0.4, maxZoom: 1, padding: 60 });

  private gameManager!: GameManager;
  private networkService!: NetworkService;
  private roomId = "";
  private players: Player[] = [];
  private localPlayerId = "";
  private boardContainer!: Phaser.GameObjects.Container;
  private readonly boardPieceViews = new Map<string, DominoPieceView>();
  private localHandView!: LocalHandView;
  private opponentViews = {} as Record<OpponentSlot, OpponentSeatView>;
  private topBarText!: Phaser.GameObjects.Text;
  private turnIndicatorText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private timelinePanel!: TimelinePanelView;
  private readonly timelineEntries: string[] = [];
  private sideChoiceView!: SideChoiceView;
  // Peca clicada aguardando o jogador escolher em qual ponta jogar, quando
  // ela encaixa nos dois lados abertos do tabuleiro (ver
  // handleLocalPieceClicked). null = nenhuma escolha pendente.
  private pendingPiece: DominoPiece | null = null;
  private boardArea: Rect = { x: 0, y: 0, width: 0, height: 0 };
  // Phaser chama update() a cada frame independente do create() (async
  // para o modo online) ja ter terminado. Sem este guard, update() roda
  // enquanto gameManager existe mas as views ainda nao foram construidas
  // (buildStaticVisuals so acontece no fim do create()) e explode.
  private ready = false;

  constructor() {
    super(SCENE_KEYS.Table);
  }

  async create(data: TableSceneData = {}): Promise<void> {
    // O Phaser reaproveita a MESMA instancia de Scene entre partidas (Table
    // -> Menu -> Table de novo nao recria o objeto) - inicializador de
    // campo de classe (`= []`, `= false`) so roda uma vez, na primeira
    // partida. Sem resetar aqui, a timeline acumulava entre partidas e
    // `ready` continuava `true` da partida anterior enquanto esta (async)
    // ainda estava no meio da configuracao - podendo chamar update() num
    // gameManager de uma partida ja encerrada.
    this.ready = false;
    this.pendingPiece = null;
    this.timelineEntries.length = 0;
    this.boardPieceViews.clear();

    this.statusText = this.add
      .text(0, 0, "", { fontSize: "20px", color: "#f5f0e6" })
      .setOrigin(0.5)
      .setPosition(this.scale.width / 2, this.scale.height / 2);

    await this.setupOnlineGame(data.nickname);

    this.statusText.destroy();
    this.buildStaticVisuals();
    this.applyLayout();
    this.refreshHands();
    this.refreshTopBar();
    this.refreshTurnIndicator();

    this.gameManager.events.on("stateChanged", () => this.refresh());
    // "partida" no domino = uma rodada (mao esvaziada ou jogo travado), nao
    // o placar acumulado de Match (esse so existe hoje no modo local e nao
    // tem fluxo de proxima rodada implementado ainda).
    this.gameManager.events.on("roundEnded", (result) => this.handleRoundEnded(result));
    this.gameManager.events.on("timelineEvent", (event) => this.handleTimelineEvent(event));
    this.gameManager.events.on("invalidMove", (reason) => this.handleInvalidMove(reason));

    // this.scale (ScaleManager) e global ao Game, nao a Scene - sem tirar o
    // listener no shutdown, cada partida jogada (Table -> Menu -> Table...)
    // empilha mais um handler chamando applyLayout() numa Scene desativada.
    const onResize = () => this.applyLayout();
    this.scale.on("resize", onResize);
    this.events.once("shutdown", () => this.scale.off("resize", onResize));

    this.ready = true;
  }

  override update(_time: number, delta: number): void {
    if (!this.ready) return;
    this.gameManager.getTimerService().tick(delta);
    this.updateOpponentBadges();
  }

  // Fluxo de identidade: o nome ja vem da MenuScene (data.nickname); so
  // falta o guest-login + join na sala Colyseus, e so entao monta o
  // GameManager e aguarda os outros jogadores/o servidor iniciar a
  // partida de verdade. Uma tela de login/cadastro completa fica para uma
  // proxima rodada.
  private async setupOnlineGame(nicknameHint?: string): Promise<void> {
    const nickname = nicknameHint?.trim() || undefined;
    const networkService = new ColyseusNetworkService(nickname);
    this.networkService = networkService;

    networkService.receivePublicState((state) => {
      this.players = [...state.players].sort((a, b) => a.seat - b.seat).map((p) => new Player(p.id, p.username, p.seat));
      this.statusText.setText(this.describeWaitingStatus(state.status, this.players.length));
    });

    this.statusText.setText("Conectando...");
    await networkService.connect();
    const roomInfo = await networkService.joinRoom("domino", nickname ?? "");
    this.roomId = roomInfo.roomId;
    const identity = networkService.getLocalIdentity();
    if (!identity) {
      throw new Error("Falha ao resolver identidade do jogador apos o join");
    }
    this.localPlayerId = identity.id;

    this.gameManager = new GameManager(networkService, this.localPlayerId);
    this.statusText.setText(this.describeWaitingStatus("waiting", this.players.length));

    await this.gameManager.startMatch();
  }

  private describeWaitingStatus(status: string, playerCount: number): string {
    if (status === "starting") return "Todos conectados - aguardando jogadores ficarem prontos...";
    return `Aguardando jogadores (${playerCount}/4)...`;
  }

  private buildStaticVisuals(): void {
    this.boardContainer = this.add.container(0, 0);

    this.topBarText = this.add.text(0, 0, "", { fontSize: "16px", color: "#f5f0e6" }).setOrigin(0, 0.5);
    this.turnIndicatorText = this.add
      .text(0, 0, "", { fontSize: "20px", color: "#7CFC9B", fontStyle: "bold" })
      .setOrigin(0.5, 1);

    this.localHandView = new LocalHandView(
      this,
      { pieceLength: PIECE_LENGTH * 1.4, pieceThickness: PIECE_WIDTH * 1.4, areaWidth: 600 },
      (piece) => this.handleLocalPieceClicked(piece)
    );

    for (const slot of OPPONENT_SLOTS) {
      this.opponentViews[slot] = new OpponentSeatView(this, { width: 130, height: 70 });
    }

    this.timelinePanel = new TimelinePanelView(this, { width: 1, height: 1 });

    this.sideChoiceView = new SideChoiceView(this, { buttonWidth: 150, buttonHeight: 44, gap: 16 }, (side) =>
      this.handleSideChosen(side)
    );
  }

  private applyLayout(): void {
    const schema = this.layoutManager.compute({ width: this.scale.width, height: this.scale.height });
    this.boardArea = schema.boardArea;

    this.topBarText.setPosition(schema.topBar.x + 16, schema.topBar.y + schema.topBar.height / 2);

    this.localHandView.setPosition(
      schema.localHandArea.x + schema.localHandArea.width / 2,
      schema.localHandArea.y + schema.localHandArea.height / 2
    );
    this.localHandView.setAreaWidth(schema.localHandArea.width * 0.94);

    this.turnIndicatorText.setPosition(
      schema.localHandArea.x + schema.localHandArea.width / 2,
      schema.localHandArea.y - 8
    );

    this.sideChoiceView.setPosition(
      schema.localHandArea.x + schema.localHandArea.width / 2,
      schema.localHandArea.y - 60
    );

    this.timelinePanel.setPosition(schema.chatPanel.x, schema.chatPanel.y);
    this.timelinePanel.resize(schema.chatPanel.width, schema.chatPanel.height);
    this.timelinePanel.setEntries(this.timelineEntries);

    for (const slot of OPPONENT_SLOTS) {
      const rect = schema.opponentSlots[slot];
      this.opponentViews[slot].setPosition(rect.x + rect.width / 2, rect.y + rect.height / 2);
    }

    this.refreshBoard();
  }

  private refresh(): void {
    this.refreshBoard();
    this.refreshHands();
    this.refreshTopBar();
    this.refreshTurnIndicator();
    this.cancelPendingChoiceIfStale();
  }

  // Se por algum motivo o estado mudou enquanto uma escolha de lado estava
  // pendente (turno passou adiante, peca nao esta mais na mao), cancela em
  // vez de deixar o prompt velho na tela apontando pra uma jogada que nao
  // faz mais sentido.
  private cancelPendingChoiceIfStale(): void {
    if (!this.pendingPiece) return;

    const game = this.gameManager.getCurrentGame();
    const stillMyTurn = game.getCurrentPlayerId() === this.getBottomPlayerId();
    const stillInHand = game.getHand(this.getBottomPlayerId()).has(this.pendingPiece.id);

    if (!stillMyTurn || !stillInHand) {
      this.pendingPiece = null;
      this.sideChoiceView.hide();
    }
  }

  private refreshBoard(): void {
    const game = this.gameManager.getCurrentGame();
    const placedPieces = this.boardLayout.computeLayout(game.getBoard());

    // Peca por id, nao por indice: jogar no lado esquerdo da cadeia faz
    // unshift no array do GameState, entao o indice de cada peca dentro
    // dele muda a cada rodada. Associar view por posicao (array simples)
    // fazia a view errada (peca antiga) ser reposicionada onde uma peca
    // diferente deveria estar. O id da peca e estavel, entao o cache por
    // id sempre aplica o placement certo na view certa.
    for (const placed of placedPieces) {
      let view = this.boardPieceViews.get(placed.piece.id);
      if (!view) {
        view = new DominoPieceView(this, placed.piece, {
          length: PIECE_LENGTH,
          thickness: PIECE_WIDTH
        });
        this.boardContainer.add(view);
        this.boardPieceViews.set(placed.piece.id, view);
      }
      view.applyPlacement(placed);
    }

    const bounds = this.boardLayout.computeBounds(placedPieces);
    const fit = this.cameraBounds.calculateFit(bounds, {
      width: this.boardArea.width,
      height: this.boardArea.height
    });

    this.boardContainer.setScale(fit.zoom);
    this.boardContainer.setPosition(
      this.boardArea.x + this.boardArea.width / 2 - fit.centerX * fit.zoom,
      this.boardArea.y + this.boardArea.height / 2 - fit.centerY * fit.zoom
    );
  }

  private refreshHands(): void {
    const bottomPlayerId = this.getBottomPlayerId();
    this.localHandView.setHand(this.gameManager.getCurrentGame().getHand(bottomPlayerId).getPieces());
    this.updateOpponentBadges();
  }

  private refreshTopBar(): void {
    const game = this.gameManager.getCurrentGame();
    const currentPlayer = this.players.find((player) => player.id === game.getCurrentPlayerId());
    const myName = this.players.find((player) => player.id === this.localPlayerId)?.name;
    this.topBarText.setText(
      `Sala Online (${myName ?? "..."})  |  Vez de: ${currentPlayer?.name ?? "-"}  |  Boneyard: ${game.getBoneyardCount()}`
    );
  }

  private refreshTurnIndicator(): void {
    const game = this.gameManager.getCurrentGame();
    const isMyTurn = game.getCurrentPlayerId() === this.getBottomPlayerId();
    this.turnIndicatorText.setText(isMyTurn ? "SUA VEZ" : "");
  }

  // Feedback de fim de partida: hoje o servidor encerra a partida
  // corretamente (ver DominoRoom.finishMatch), mas nada na tela avisava -
  // so parava de responder, dando a impressao de travamento.
  private handleRoundEnded(result: RoundResult): void {
    const message = this.describeRoundResult(result);
    this.pushTimelineEntry(message);
    window.alert(message);
    void this.networkService.leaveRoom(this.roomId, this.localPlayerId);
    this.scene.start(SCENE_KEYS.Menu);
  }

  private describeRoundResult(result: RoundResult): string {
    if (!result.winnerId) return "Empate! Ninguém venceu essa rodada.";

    const duo = this.describeWinningDuo(result.winnerId);
    if (!result.winKind) return `A dupla ${duo} venceu!`;

    const phrase = WIN_REASON_PHRASES[result.winKind];
    const points = WIN_BONUS_POINTS[result.winKind];
    const suffix = phrase ? ` ${phrase}` : "";
    return `A dupla ${duo} venceu${suffix}! (+${points} pontos)`;
  }

  // Dupla = mesmo seat%2 (parceiros ficam em assentos opostos - mesma
  // convencao usada no servidor, ver DominoRules.teamOf).
  private describeWinningDuo(winnerId: string): string {
    const winner = this.players.find((player) => player.id === winnerId);
    if (!winner) return winnerId;

    const team = winner.seat % 2;
    return this.players
      .filter((player) => player.seat % 2 === team)
      .map((player) => player.name)
      .join(" e ");
  }

  private handleTimelineEvent(event: TimelineEvent): void {
    switch (event.type) {
      case "match_started":
        this.pushTimelineEntry("Partida iniciada.");
        return;
      case "tile_played":
        this.pushTimelineEntry(`${this.nameFor(event.playerId)} jogou ${event.piece.left}|${event.piece.right}.`);
        return;
      case "turn_passed":
        this.pushTimelineEntry(`${this.nameFor(event.playerId)} passou a vez.`);
        return;
    }
  }

  // So o modo online chega aqui: o modo local ja filtra essa jogada em
  // GameManager.getPlayableSides (via GameState.canPlay), entao o
  // SideChoiceView nunca oferece um lado que o servidor rejeitaria.
  private handleInvalidMove(reason: string): void {
    if (reason === "must_avoid_blocking") {
      window.alert("Você não pode fechar o jogo jogando esse lado — a outra ponta mantém a partida aberta.");
    }
  }

  private pushTimelineEntry(line: string): void {
    this.timelineEntries.push(line);
    this.timelinePanel.setEntries(this.timelineEntries);
  }

  private nameFor(playerId: string): string {
    return this.players.find((player) => player.id === playerId)?.name ?? playerId;
  }

  private updateOpponentBadges(): void {
    if (!this.gameManager) return;

    const game = this.gameManager.getCurrentGame();
    const seatToSlot = this.getSeatToSlotMapping();

    for (const player of this.players) {
      const slot = seatToSlot[player.seat];
      if (!slot || slot === "bottom") continue;

      this.opponentViews[slot].setSeatInfo(
        player.name,
        game.getHand(player.id).count(),
        this.gameManager.getTimerService().getRemaining(player.id),
        game.getCurrentPlayerId() === player.id
      );
    }
  }

  private getBottomPlayerId(): string {
    return this.localPlayerId;
  }

  private getSeatToSlotMapping(): Record<number, VisualSlot> {
    const bottomPlayerId = this.getBottomPlayerId();
    const bottomSeat = this.players.find((player) => player.id === bottomPlayerId)?.seat ?? 0;
    return this.layoutManager.mapSeatsToSlots(bottomSeat, this.players.length);
  }

  private handleLocalPieceClicked(piece: DominoPiece): void {
    // Clicar de novo na mesma peca que ja esta com a escolha de lado
    // aberta cancela em vez de abrir outra.
    if (this.pendingPiece?.id === piece.id) {
      this.cancelPendingChoice();
      return;
    }

    const activePlayerId = this.getBottomPlayerId();
    const sides = this.gameManager.getPlayableSides(activePlayerId, piece.id);
    if (sides.length === 0) return;

    const openEnds = this.gameManager.getOpenEndValues();
    // Mesa vazia: qualquer lado da primeira peca da no mesmo, entao nao
    // ha escolha real pra perguntar - joga direto.
    if (sides.length === 1 || !openEnds) {
      this.cancelPendingChoice();
      this.gameManager.playPiece(activePlayerId, piece.id, sides[0]!);
      return;
    }

    this.pendingPiece = piece;
    this.sideChoiceView.showFor(openEnds);
  }

  private handleSideChosen(side: MoveSide): void {
    if (!this.pendingPiece) return;

    const activePlayerId = this.getBottomPlayerId();
    const piece = this.pendingPiece;
    this.cancelPendingChoice();
    this.gameManager.playPiece(activePlayerId, piece.id, side);
  }

  private cancelPendingChoice(): void {
    this.pendingPiece = null;
    this.sideChoiceView.hide();
  }
}
