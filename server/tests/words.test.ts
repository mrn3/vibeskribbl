import test from "node:test";
import assert from "node:assert/strict";

import { difficultiesForStanding, pickWords, wordDifficulty } from "../src/words.js";

const defaults = { customWordsOnly: false, customWords: [] };

test("first round and tied scores offer all three difficulties", () => {
  assert.deepEqual(difficultiesForStanding(1, 900, [900, 0]), ["easy", "medium", "hard"]);
  assert.deepEqual(difficultiesForStanding(2, 100, [100, 100]), ["easy", "medium", "hard"]);
  for (let i = 0; i < 50; i++) {
    const words = pickWords(3, defaults);
    assert.equal(new Set(words).size, 3);
    assert.deepEqual(words.map(wordDifficulty), ["easy", "medium", "hard"]);
  }
  for (const count of [1, 2, 4, 5]) {
    assert.deepEqual(
      pickWords(count, defaults).map(wordDifficulty),
      Array.from({ length: count }, (_, i) => ["easy", "medium", "hard"][i % 3])
    );
  }
});

test("later rounds adjust for standings, ties, and a substantial lead", () => {
  assert.deepEqual(difficultiesForStanding(2, 300, [300, 250, 100]), ["medium", "hard"]);
  assert.deepEqual(difficultiesForStanding(2, 300, [300, 300, 100]), ["medium", "hard"]);
  assert.deepEqual(difficultiesForStanding(2, 300, [300, 200, 100]), ["hard"]);
  assert.deepEqual(difficultiesForStanding(2, 99, [99, 0]), ["medium", "hard"]);
  assert.deepEqual(difficultiesForStanding(2, 100, [300, 200, 100]), ["easy", "easy", "medium"]);
  assert.deepEqual(difficultiesForStanding(2, 200, [300, 200, 100]), ["easy", "medium", "hard"]);

  assert.deepEqual(
    pickWords(5, defaults, undefined, ["hard"]).map(wordDifficulty),
    ["hard", "hard", "hard", "hard", "hard"]
  );
  assert.deepEqual(
    pickWords(3, defaults, undefined, ["medium", "hard"]).map(wordDifficulty),
    ["medium", "hard", "medium"]
  );
});

test("custom lists preserve uniqueness, avoid used words where possible, and fall back when necessary", () => {
  const custom = { customWordsOnly: true, customWords: ["ant", "kiwi", "planet", "imagination", "ANT"] };
  assert.deepEqual(
    pickWords(3, custom, new Set(["ant"]), ["easy", "medium", "hard"]).map(wordDifficulty),
    ["easy", "medium", "hard"]
  );
  assert.equal(pickWords(1, custom, new Set(["ant"]), ["easy"])[0], "kiwi");
  assert.equal(pickWords(1, custom, new Set(["ant", "kiwi"]), ["easy"]).length, 1);
  const small = pickWords(5, { customWordsOnly: true, customWords: ["ant", "bear"] }, undefined, ["hard"]);
  assert.equal(small.length, 2);
  assert.equal(new Set(small).size, 2);
  assert.ok(small.every((w) => ["ant", "bear"].includes(w)));
});
