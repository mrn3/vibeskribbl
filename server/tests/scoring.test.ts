import test from "node:test";
import assert from "node:assert/strict";

import { applyCatchUpBonus, guesserScore } from "../src/scoring.js";

const guess = {
  drawTimeSec: 60,
  secondsLeft: 60,
  hintCount: 2,
  hintsLeftAtGuess: 2,
  guesserCount: 6,
  alreadyGuessedBeforeYou: 0
};

test("guess order rewards early guesses but retains at least a 60% multiplier", () => {
  const scores = Array.from({ length: 6 }, (_, alreadyGuessedBeforeYou) =>
    guesserScore({ ...guess, alreadyGuessedBeforeYou })
  );
  assert.deepEqual(scores, [420, 350, 280, 252, 252, 252]);
  assert.equal(guesserScore({ ...guess, guesserCount: 1 }), 420);
});

test("late guesses still lose time and hint bonuses, not the order floor", () => {
  const lateGuess = { ...guess, secondsLeft: 10, hintsLeftAtGuess: 0 };
  const first = guesserScore(lateGuess);
  const last = guesserScore({ ...lateGuess, alreadyGuessedBeforeYou: 5 });
  assert.ok(first < guesserScore({ ...guess, hintsLeftAtGuess: 0 }));
  assert.ok(first < guesserScore({ ...lateGuess, hintsLeftAtGuess: 2 }));
  assert.equal(last, Math.floor(first * 0.6));
});

test("catch-up bonuses scale with the relative deficit, cap at 50%, and round down", () => {
  assert.equal(applyCatchUpBonus(100, 1000, 1000), 100);
  assert.equal(applyCatchUpBonus(100, 750, 1000), 112);
  assert.equal(applyCatchUpBonus(100, 500, 1000), 125);
  assert.equal(applyCatchUpBonus(100, 0, 1000), 150);
  assert.equal(applyCatchUpBonus(100, 0, 0), 100);
  assert.equal(applyCatchUpBonus(0, 0, 1000), 0);
});
