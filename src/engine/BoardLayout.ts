import { DominoPiece } from "./DominoPiece";
import { BoardBounds } from "./BoardBounds";

// Calcula posicao (x,y) e rotacao de cada peca da cadeia do tabuleiro,
// em "unidades de mundo" (nao pixels de tela - isso e responsabilidade
// de quem desenha). Layout em "cobra" (snake) bilateral, estilo playdrift:
//
// - A primeira peca jogada fica ancorada no centro (0,0) e NUNCA se move.
// - As duas pontas da cadeia crescem para fora de forma independente:
//   a ponta direita comeca andando para +x, a esquerda para -x.
// - QUALQUER peca pode virar a curva quando a ponta chega no limite da
//   area util (nao apenas duplas): a peca do canto e desenhada
//   perpendicular, "dobrando" rente a metade aberta da vizinha anterior.
// - Cada ponta espirala sempre no mesmo sentido de rotacao, e toda peca
//   nova e validada contra TODAS as ja colocadas (com uma folga minima),
//   entao trilhas paralelas nunca se encostam e as duas pontas nunca se
//   encontram - quando uma ponta ficaria presa, a area util e ampliada
//   (worldScale) e o layout inteiro e refeito: zoom out so em ultimo caso.
// - O layout e incremental e deterministico: pecas ja colocadas nao mudam
//   de lugar quando novas entram; apenas resize da tela (viewport novo)
//   ou o alivio de escala refazem tudo do zero, replay identico via
//   `history` (ordem de insercao registrada).
export interface PlacedPiece {
  piece: DominoPiece;
  x: number;
  y: number;
  rotation: number;
  // true quando a metade fisica que encosta na vizinha anterior deve
  // mostrar o OUTRO valor da peca. piece.left sempre encosta no vizinho
  // da esquerda da cadeia e piece.right no da direita (ver GameState),
  // mas com a cobra bilateral o "vizinho ja colocado" muda de lado
  // conforme a ponta (esquerda/direita) e o sentido do trecho - quem
  // desenha (DominoPieceView) usa este flag para trocar as metades.
  reversed: boolean;
  // Meio-tamanho do retangulo ocupado na tela (ja considerando rotacao e
  // duplas atravessadas) - usado para bounds e checagem de sobreposicao.
  halfWidth: number;
  halfHeight: number;
}

// Area util (em unidades de mundo = pixels em zoom 1) dentro da qual a
// cobra deve caber sem reduzir o zoom.
export interface LayoutViewport {
  width: number;
  height: number;
}

export interface BoardLayoutConfig {
  pieceLength: number;
  pieceWidth: number;
  // Folga minima entre pecas NAO vizinhas da cadeia (trilhas paralelas da
  // espiral, pontas se aproximando). Vizinhas diretas continuam coladas.
  gap: number;
}

type HistorySide = "anchor" | "left" | "right";

interface HistoryEntry {
  piece: DominoPiece;
  side: HistorySide;
}

// Estado da frente de crescimento de uma ponta: onde esta a borda aberta,
// para onde anda, em que sentido espirala e a silhueta da ultima peca
// (necessaria para posicionar a peca de canto rente a ela).
interface Cursor {
  x: number;
  y: number;
  dx: number;
  dy: number;
  lastTurnSign: number | null;
  prevPieceId: string;
  // Meio-extensao da ultima peca no eixo PERPENDICULAR ao movimento.
  prevAcrossHalf: number;
  // Distancia da borda aberta ate o centro da "celula" aberta da ultima
  // peca (meia-peca comum ou celula unica da dupla atravessada).
  prevBackHalf: number;
}

interface Candidate {
  placement: PlacedPiece;
  cursor: Cursor;
}

// Sentido de rotacao padrao das espirais. -1 faz a ponta direita virar
// para cima e a esquerda para baixo (como no playdrift): as duas giram no
// MESMO sentido angular ao redor do centro, entao se perseguem em trilhas
// concentricas em vez de rumarem uma contra a outra.
const DEFAULT_TURN_SIGN = -1;
// Fator de ampliacao da area util quando a cobra nao cabe mais (cada passo
// equivale a ~13% de zoom out apos o enquadramento da camera).
const RELIEF_GROWTH = 1.15;
const MAX_RELIEF_STEPS = 40;

export class BoardLayout {
  private history: HistoryEntry[] = [];
  private readonly placements = new Map<string, PlacedPiece>();
  private cursors: { left: Cursor | null; right: Cursor | null } = { left: null, right: null };
  private bounds = BoardBounds.empty();
  private viewport: LayoutViewport = { width: 0, height: 0 };
  private worldScale = 1;

  constructor(private readonly config: BoardLayoutConfig) {}

  // Esquece toda a partida (historico, escala de alivio). Chamar ao
  // iniciar uma nova partida - a instancia e reaproveitada entre elas.
  reset(): void {
    this.history = [];
    this.placements.clear();
    this.cursors = { left: null, right: null };
    this.bounds = BoardBounds.empty();
    this.worldScale = 1;
  }

  computeLayout(chain: readonly DominoPiece[], viewport: LayoutViewport): PlacedPiece[] {
    if (chain.length === 0) {
      this.reset();
      this.viewport = { ...viewport };
      return [];
    }

    let needReplay = false;
    if (viewport.width !== this.viewport.width || viewport.height !== this.viewport.height) {
      // Resize: a area util mudou, entao o desenho inteiro e refeito do
      // zero (e a escala de alivio volta a 1 - a nova area pode ate ser
      // maior). E isso que faz a cobra "se adaptar" ao tamanho da tela.
      this.viewport = { ...viewport };
      this.worldScale = 1;
      needReplay = true;
    }

    const sync = this.syncHistory(chain);
    if (sync.rebuilt) needReplay = true;

    if (needReplay) {
      this.replayWithRelief();
    } else {
      for (const entry of sync.newEntries) {
        if (!this.tryPlaceEntry(entry, false)) {
          // Ponta presa: amplia a area util e refaz tudo (inclusive as
          // entradas novas ainda nao colocadas, que ja estao no history).
          this.worldScale *= RELIEF_GROWTH;
          this.replayWithRelief();
          break;
        }
      }
    }

    const result: PlacedPiece[] = [];
    for (const piece of chain) {
      const placed = this.placements.get(piece.id);
      if (placed) result.push(placed);
    }
    return result;
  }

  computeBounds(placedPieces: readonly PlacedPiece[]): BoardBounds {
    let bounds = BoardBounds.empty();
    for (const placed of placedPieces) {
      bounds = bounds.expandToInclude(placed.x - placed.halfWidth, placed.y - placed.halfHeight);
      bounds = bounds.expandToInclude(placed.x + placed.halfWidth, placed.y + placed.halfHeight);
    }
    return bounds;
  }

  // Mantem o historico de insercao em sincronia com a cadeia recebida.
  // A cadeia so cresce pelas pontas, entao a posicao da ancora (primeira
  // peca registrada) dentro do array novo revela quantas pecas entraram
  // de cada lado. Se a cadeia recebida nao for compativel (outra partida,
  // reconexao), reconstroi do zero ancorando no meio da cadeia.
  private syncHistory(chain: readonly DominoPiece[]): { newEntries: HistoryEntry[]; rebuilt: boolean } {
    if (this.history.length === 0) {
      this.rebuildHistory(chain);
      return { newEntries: [], rebuilt: true };
    }

    const anchorId = this.history[0]!.piece.id;
    const anchorIndex = chain.findIndex((piece) => piece.id === anchorId);

    let leftCount = 0;
    let rightCount = 0;
    for (const entry of this.history) {
      if (entry.side === "left") leftCount++;
      else if (entry.side === "right") rightCount++;
    }

    const incompatible =
      anchorIndex < leftCount || chain.length - 1 - anchorIndex < rightCount;
    if (incompatible) {
      this.rebuildHistory(chain);
      return { newEntries: [], rebuilt: true };
    }

    const newEntries: HistoryEntry[] = [];
    for (let i = anchorIndex + 1 + rightCount; i < chain.length; i++) {
      newEntries.push({ piece: chain[i]!, side: "right" });
    }
    for (let i = anchorIndex - leftCount - 1; i >= 0; i--) {
      newEntries.push({ piece: chain[i]!, side: "left" });
    }
    this.history.push(...newEntries);
    return { newEntries, rebuilt: false };
  }

  private rebuildHistory(chain: readonly DominoPiece[]): void {
    this.history = [];
    // Normalmente chain.length === 1 aqui (primeira jogada). Em reconexao
    // no meio da partida, ancorar no meio distribui a cadeia dos dois
    // lados, aproximando o desenho que os outros jogadores ja veem.
    const anchorIndex = Math.floor((chain.length - 1) / 2);
    this.history.push({ piece: chain[anchorIndex]!, side: "anchor" });

    let right = anchorIndex + 1;
    let left = anchorIndex - 1;
    while (right < chain.length || left >= 0) {
      if (right < chain.length) this.history.push({ piece: chain[right++]!, side: "right" });
      if (left >= 0) this.history.push({ piece: chain[left--]!, side: "left" });
    }
  }

  // Refaz o layout inteiro; se nao couber, amplia a area util em passos
  // ate caber (zoom out gradual). O teto de passos e um failsafe - com 28
  // pecas no set, nunca chega perto.
  private replayWithRelief(): void {
    for (let step = 0; step < MAX_RELIEF_STEPS; step++) {
      if (this.replayAll(false)) return;
      this.worldScale *= RELIEF_GROWTH;
    }
    this.replayAll(true);
  }

  private replayAll(force: boolean): boolean {
    this.placements.clear();
    this.cursors = { left: null, right: null };
    this.bounds = BoardBounds.empty();

    for (const entry of this.history) {
      if (!this.tryPlaceEntry(entry, force)) return false;
    }
    return true;
  }

  // Tenta colocar a peca na ponta correspondente: primeiro em linha reta,
  // depois virando no sentido da espiral da ponta, depois no sentido
  // contrario. `force` ignora as checagens (ultimo failsafe, para o jogo
  // nunca ficar sem desenho).
  private tryPlaceEntry(entry: HistoryEntry, force: boolean): boolean {
    if (entry.side === "anchor") {
      this.placeAnchor(entry.piece);
      return true;
    }

    const cursor = this.cursors[entry.side];
    if (!cursor) return false;

    const preferredSign = cursor.lastTurnSign ?? DEFAULT_TURN_SIGN;
    const candidates = [
      this.buildStraightCandidate(cursor, entry.piece, entry.side),
      this.buildTurnCandidate(cursor, entry.piece, entry.side, preferredSign),
      this.buildTurnCandidate(cursor, entry.piece, entry.side, -preferredSign)
    ];

    for (const candidate of candidates) {
      if (force || this.fits(candidate.placement, cursor.prevPieceId)) {
        this.commit(entry.side, candidate);
        return true;
      }
    }
    return false;
  }

  private placeAnchor(piece: DominoPiece): void {
    const isDouble = piece.isDouble();
    const along = isDouble ? this.config.pieceWidth : this.config.pieceLength;
    const acrossHalf = isDouble ? this.config.pieceLength / 2 : this.config.pieceWidth / 2;

    const placement: PlacedPiece = {
      piece,
      x: 0,
      y: 0,
      rotation: isDouble ? Math.PI / 2 : 0,
      reversed: false,
      halfWidth: along / 2,
      halfHeight: acrossHalf
    };

    this.placements.set(piece.id, placement);
    this.bounds = this.expandBounds(this.bounds, placement);

    const prevBackHalf = isDouble ? this.config.pieceWidth / 2 : this.config.pieceLength / 4;
    const base = {
      lastTurnSign: null,
      prevPieceId: piece.id,
      prevAcrossHalf: acrossHalf,
      prevBackHalf
    };
    this.cursors.right = { x: along / 2, y: 0, dx: 1, dy: 0, ...base };
    this.cursors.left = { x: -along / 2, y: 0, dx: -1, dy: 0, ...base };
  }

  private buildStraightCandidate(cursor: Cursor, piece: DominoPiece, side: HistorySide): Candidate {
    const isDouble = piece.isDouble();
    // Duplas seguem atravessadas na trilha (visual classico de bucha):
    // curtas no eixo do movimento, compridas no perpendicular.
    const along = isDouble ? this.config.pieceWidth : this.config.pieceLength;
    const acrossHalf = isDouble ? this.config.pieceLength / 2 : this.config.pieceWidth / 2;
    const horizontal = cursor.dy === 0;

    const placement: PlacedPiece = {
      piece,
      x: cursor.x + cursor.dx * (along / 2),
      y: cursor.y + cursor.dy * (along / 2),
      rotation: horizontal ? (isDouble ? Math.PI / 2 : 0) : (isDouble ? 0 : Math.PI / 2),
      reversed: isDouble ? false : this.reversedFor(side, cursor.dx, cursor.dy),
      halfWidth: horizontal ? along / 2 : acrossHalf,
      halfHeight: horizontal ? acrossHalf : along / 2
    };

    return {
      placement,
      cursor: {
        x: cursor.x + cursor.dx * along,
        y: cursor.y + cursor.dy * along,
        dx: cursor.dx,
        dy: cursor.dy,
        lastTurnSign: cursor.lastTurnSign,
        prevPieceId: piece.id,
        prevAcrossHalf: acrossHalf,
        prevBackHalf: isDouble ? this.config.pieceWidth / 2 : this.config.pieceLength / 4
      }
    };
  }

  // Peca de canto: entra perpendicular ao movimento atual, "dobrando"
  // rente a celula aberta da peca anterior (fica na mesma coluna/linha da
  // metade aberta, deslocada para o lado da curva) - e o L do playdrift.
  // sign define o lado da curva; cada ponta reaproveita o mesmo sign nas
  // curvas seguintes, entao a trilha espirala num sentido consistente.
  private buildTurnCandidate(cursor: Cursor, piece: DominoPiece, side: HistorySide, sign: number): Candidate {
    const pdx = -cursor.dy * sign;
    const pdy = cursor.dx * sign;
    const halfLength = this.config.pieceLength / 2;

    const x = cursor.x - cursor.dx * cursor.prevBackHalf + pdx * (cursor.prevAcrossHalf + halfLength);
    const y = cursor.y - cursor.dy * cursor.prevBackHalf + pdy * (cursor.prevAcrossHalf + halfLength);
    const horizontal = pdy === 0;

    const placement: PlacedPiece = {
      piece,
      x,
      y,
      // No canto ate dupla e desenhada deitada no novo eixo (caso raro:
      // dupla so vira canto quando nem atravessada em linha reta coube).
      rotation: horizontal ? 0 : Math.PI / 2,
      reversed: piece.isDouble() ? false : this.reversedFor(side, pdx, pdy),
      halfWidth: horizontal ? halfLength : this.config.pieceWidth / 2,
      halfHeight: horizontal ? this.config.pieceWidth / 2 : halfLength
    };

    return {
      placement,
      cursor: {
        x: x + pdx * halfLength,
        y: y + pdy * halfLength,
        dx: pdx,
        dy: pdy,
        lastTurnSign: sign,
        prevPieceId: piece.id,
        prevAcrossHalf: this.config.pieceWidth / 2,
        prevBackHalf: this.config.pieceLength / 4
      }
    };
  }

  // A metade fisica "primeira" (esquerda/topo) mostra piece.left quando
  // reversed=false. O valor que conecta com o vizinho ja colocado precisa
  // ficar na metade voltada para tras do movimento; na ponta direita o
  // valor de conexao e piece.left, na esquerda e piece.right - dai o XOR
  // entre ponta e sentido do trecho.
  private reversedFor(side: HistorySide, dx: number, dy: number): boolean {
    const movesNegative = dx < 0 || dy < 0;
    return (side === "left") !== movesNegative;
  }

  // Uma colocacao vale quando (1) o tabuleiro continua cabendo na area
  // util ampliada pela escala de alivio e (2) a peca nao encosta em
  // NENHUMA outra alem da vizinha direta - com folga `gap`, o que mantem
  // trilhas paralelas separadas e impede as pontas de se encontrarem.
  private fits(placement: PlacedPiece, prevPieceId: string): boolean {
    const limitWidth = this.viewport.width > 0 ? this.viewport.width * this.worldScale : Infinity;
    const limitHeight = this.viewport.height > 0 ? this.viewport.height * this.worldScale : Infinity;

    const expanded = this.expandBounds(this.bounds, placement);
    if (expanded.width() > limitWidth || expanded.height() > limitHeight) return false;

    for (const other of this.placements.values()) {
      if (other.piece.id === prevPieceId) continue;
      const overlapX = Math.abs(placement.x - other.x) < placement.halfWidth + other.halfWidth + this.config.gap;
      const overlapY = Math.abs(placement.y - other.y) < placement.halfHeight + other.halfHeight + this.config.gap;
      if (overlapX && overlapY) return false;
    }
    return true;
  }

  private commit(side: "left" | "right", candidate: Candidate): void {
    this.placements.set(candidate.placement.piece.id, candidate.placement);
    this.bounds = this.expandBounds(this.bounds, candidate.placement);
    this.cursors[side] = candidate.cursor;
  }

  private expandBounds(bounds: BoardBounds, placement: PlacedPiece): BoardBounds {
    return bounds
      .expandToInclude(placement.x - placement.halfWidth, placement.y - placement.halfHeight)
      .expandToInclude(placement.x + placement.halfWidth, placement.y + placement.halfHeight);
  }
}
