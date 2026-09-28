import assert from "node:assert";
import { pointOf, neighbours, groupOf, liberties, areaOf } from "../board.js";
import { play, pass } from "../rules.js";
import { render } from "../app.js";

const zeros = [];
for (let at = 0; at < 7; at += 1) {
  zeros.push([0, 0, 0, 0, 0, 0, 0]);
}

const base = {
  state: { size: 7, board: zeros, toMove: 1, captures: [0, 0], koPoint: [0, 0],
           passStreak: 0, finished: false, moves: [], placed: [0, 0] },
  events: [{ kind: "play", color: 1, point: "D4" }]
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("pointOf gives a pair", () => {
  assert.ok(Array.isArray(pointOf("D4")));
});

check("neighbours gives a list", () => {
  assert.ok(Array.isArray(neighbours(7, 1, 1)));
});

check("groupOf gives a list", () => {
  assert.ok(Array.isArray(groupOf(base.state.board, 1, 1)));
});

check("liberties gives a number", () => {
  assert.strictEqual(typeof liberties(base.state.board, 1, 1), "number");
});

check("areaOf gives three numbers", () => {
  assert.strictEqual(areaOf(base.state.board).length, 3);
});

check("play gives a state", () => {
  assert.strictEqual(typeof play(base.state, 1, "D4").board, "object");
});

check("pass gives a state", () => {
  assert.strictEqual(typeof pass(base.state, 1).moves, "object");
});

check("render counts events", () => {
  assert.strictEqual(typeof render(base).count_events, "number");
});

console.log("8 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
