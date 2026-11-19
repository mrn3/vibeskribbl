/**
 * Skribbl-style scoring with catch-up rules (server-side, documented behavior):
 * - Guessers: faster guesses earn more; earlier correct guesses earn more than later ones,
 *   with the guess-order multiplier never falling below 60%.
 * - Correct guesses receive up to 50% extra based on the deficit relative to the leader's
 *   score, using standings frozen at turn start. Tied leaders and all-zero scores get no bonus.
 * - Drawer: if at least one player guesses correctly, the drawer earns points; if nobody
 *   guesses (or the drawer leaves mid-turn before resolution), the drawer does not earn
 *   drawer points for that word.
 *
 * The time curve matches the same shape as the “competitive” preset in scribble.rs
 * (a popular skribbl-like implementation), and the drawer reward matches scribble.rs’s
 * drawer rule: average of guessers' base points earned on that turn (counting only guessers
 * who earned points), excluding catch-up bonuses.
 */

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export function guesserScore(input: {
  drawTimeSec: number;
  secondsLeft: number;
  hintCount: number;
  hintsLeftAtGuess: number;
  guesserCount: number;
  alreadyGuessedBeforeYou: number;
}): number {
  const drawTimeSec = Math.max(1, input.drawTimeSec);
  const secondsLeft = clamp(input.secondsLeft, 0, drawTimeSec);
  const elapsed = drawTimeSec - secondsLeft;

  const base = 10;
  const maxBonus = 290;
  const declineFactor = 3 / drawTimeSec;
  const timeComponent = base + maxBonus * Math.pow(1 - declineFactor, elapsed);

  const hintCount = Math.max(0, input.hintCount);
  const hintsLeftAtGuess = clamp(input.hintsLeftAtGuess, 0, hintCount);
  const hintBonus = hintCount > 0 ? hintsLeftAtGuess * (120 / hintCount) : 0;

  const G = Math.max(1, input.guesserCount);
  const k = clamp(input.alreadyGuessedBeforeYou, 0, G - 1);
  const orderMult = Math.max(0.6, (G - k) / G);

  const raw = (timeComponent + hintBonus) * orderMult;
  return Math.max(0, Math.floor(raw));
}

export function applyCatchUpBonus(points: number, scoreAtTurnStart: number, leaderScoreAtTurnStart: number): number {
  if (leaderScoreAtTurnStart <= 0) return points;
  const deficit = clamp((leaderScoreAtTurnStart - scoreAtTurnStart) / leaderScoreAtTurnStart, 0, 1);
  return Math.floor(points * (1 + 0.5 * deficit));
}

export function drawerScoreFromGuesserPoints(guesserPoints: number[]): number {
  const pts = guesserPoints.filter((p) => p > 0);
  if (pts.length === 0) return 0;
  return Math.floor(pts.reduce((a, b) => a + b, 0) / pts.length);
}
