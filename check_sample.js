import fs from "node:fs";
import { pointOf, neighbours, groupOf, liberties, areaOf } from "./board.js";
import { play, pass } from "./rules.js";

const __lines = [];
function emit(label, value) {
  __lines.push([String(label).replace(/ =$/, ""), value]);
}

const spec = JSON.parse(fs.readFileSync(process.argv[2] || "sample/kifu.json", "utf8"));

function copy(state) {
  return JSON.parse(JSON.stringify(state));
}

function blank(size) {
  const board = [];
  for (let row = 0; row < size; row += 1) {
    const line = [];
    for (let col = 0; col < size; col += 1) { line.push(0); }
    board.push(line);
  }
  return { size: size, board: board, toMove: 1, captures: [0, 0], koPoint: [0, 0],
           passStreak: 0, finished: false, moves: [], placed: [0, 0] };
}

function step(state, event) {
  if (event.kind === "play") {
    const next = play(state, event.color, event.point);
    return next === undefined ? state : next;
  }
  if (event.kind === "pass") {
    const next = pass(state, event.color);
    return next === undefined ? state : next;
  }
  const error = new Error("E_BAD_EVENT");
  error.code = "E_BAD_EVENT";
  throw error;
}

function run(state, events) {
  let current = state;
  let failed = 0;
  for (const event of events || []) {
    try {
      current = step(current, event);
    } catch (error) {
      failed += 1;
    }
  }
  return [current, failed];
}

function fingerprint(state) {
  return JSON.stringify({ board: state.board, toMove: state.toMove, captures: state.captures,
                          koPoint: state.koPoint, passStreak: state.passStreak,
                          finished: state.finished, moves: state.moves, placed: state.placed });
}

const main = run(copy(spec.state), spec.events || []);
const state = main[0];
const failed = main[1];
const once = run(copy(spec.state), spec.events || []);
const half = Math.ceil((spec.events || []).length / 2);
const left = run(copy(spec.state), (spec.events || []).slice(0, half))[0];
const midPrint = fingerprint(left);
const right = run(left, (spec.events || []).slice(half))[0];
const replay = run(copy(spec.state), spec.events || []);

const board = state.board || [];
let blackStones = 0;
let whiteStones = 0;
for (const row of board) {
  for (const value of row) {
    if (value === 1) { blackStones += 1; }
    if (value === 2) { whiteStones += 1; }
  }
}
const area = areaOf(board);
let deadBlocks = 0;
const seenBlocks = {};
for (let row = 1; row <= state.size; row += 1) {
  for (let col = 1; col <= state.size; col += 1) {
    const line = board[row - 1] || [];
    if (line[col - 1] === 0 || line[col - 1] === undefined) { continue; }
    const block = groupOf(board, row, col);
    if (block.length === 0) { continue; }
    const key = block[0][0] + "," + block[0][1];
    if (seenBlocks[key]) { continue; }
    seenBlocks[key] = true;
    if (liberties(board, row, col) === 0) { deadBlocks += 1; }
  }
}
let ledger = true;
const captures = state.captures || [0, 0];
const placed = state.placed || [0, 0];
if (blackStones + captures[1] !== placed[0]) { ledger = false; }
if (whiteStones + captures[0] !== placed[1]) { ledger = false; }
const sum = area[0] + area[1] + area[2];
const winner = area[0] > area[1] ? 1 : (area[1] > area[0] ? 2 : 0);

emit("盘面", JSON.stringify(board));
emit("轮次", state.toMove);
emit("提子", JSON.stringify(captures));
emit("禁着点", JSON.stringify(state.koPoint));
emit("终局", state.finished);
emit("手数", (state.moves || []).length);
emit("落子记录", JSON.stringify(state.moves));
emit("落子数", JSON.stringify(placed));
emit("黑子数", blackStones);
emit("白子数", whiteStones);
emit("黑方目数", area[0]);
emit("白方目数", area[1]);
emit("中立点", area[2]);
emit("胜方", winner);
emit("无气块", deadBlocks);
emit("账目成立", ledger);
emit("面积和等于格数", sum === state.size * state.size);
emit("重放不新增", fingerprint(replay[0]) === fingerprint(state) ? 0 : 1);
emit("重放报错条数", replay[1]);
emit("拆两轮中间态不同", midPrint !== fingerprint(state));
emit("拆两轮收尾态一致", fingerprint(right) === fingerprint(once[0]) && once[1] === 0);
emit("异常事件数", failed);

// ---- 错误路径探针：真调用实现，看它报出什么码 ----
try {
  play(blank(7), 1, "H1");
  emit("越界报码", "没有报错");
} catch (error) {
  emit("越界报码", error && error.code ? error.code : String(error.message));
}
try {
  const square = blank(3);
  square.board[0][1] = 1;
  square.board[2][1] = 1;
  square.board[1][0] = 1;
  square.board[1][2] = 1;
  square.toMove = 2;
  play(square, 2, "B2");
  emit("自杀死棋报码", "没有报错");
} catch (error) {
  emit("自杀死棋报码", error && error.code ? error.code : String(error.message));
}
try {
  const corner = blank(5);
  corner.board[2][3] = 2;
  corner.board[1][3] = 1;
  corner.board[3][3] = 1;
  corner.board[2][2] = 1;
  corner.board[1][4] = 2;
  corner.board[3][4] = 2;
  const taken = play(corner, 1, "E3");
  play(taken, 2, "D3");
  emit("打劫报码", "没有报错");
} catch (error) {
  emit("打劫报码", error && error.code ? error.code : String(error.message));
}
try {
  const flat = play(blank(7), 1, "D4");
  play(flat, 2, "D4");
  emit("有子报码", "没有报错");
} catch (error) {
  emit("有子报码", error && error.code ? error.code : String(error.message));
}
try {
  play(blank(7), 2, "D4");
  emit("轮次报码", "没有报错");
} catch (error) {
  emit("轮次报码", error && error.code ? error.code : String(error.message));
}

// ---- 期望值（参考模型算出）----
const EXPECTED = {
  "盘面": [
    [
      0,
      1,
      0,
      0,
      0,
      0,
      0
    ],
    [
      1,
      0,
      0,
      0,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      0,
      1,
      0,
      1
    ],
    [
      0,
      0,
      0,
      0,
      0,
      1,
      2
    ],
    [
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    [
      2,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    [
      0,
      2,
      0,
      0,
      0,
      0,
      0
    ]
  ],
  "轮次": 2,
  "提子": [
    2,
    1
  ],
  "禁着点": [
    3,
    6
  ],
  "终局": true,
  "手数": 15,
  "落子记录": [
    [
      1,
      2,
      6,
      0
    ],
    [
      2,
      2,
      7,
      0
    ],
    [
      1,
      4,
      6,
      0
    ],
    [
      2,
      4,
      7,
      0
    ],
    [
      1,
      3,
      5,
      0
    ],
    [
      2,
      3,
      6,
      0
    ],
    [
      1,
      1,
      2,
      0
    ],
    [
      2,
      1,
      1,
      0
    ],
    [
      1,
      7,
      1,
      0
    ],
    [
      2,
      6,
      1,
      0
    ],
    [
      1,
      2,
      1,
      1
    ],
    [
      2,
      7,
      2,
      1
    ],
    [
      1,
      3,
      7,
      1
    ],
    [
      2,
      0,
      0,
      0
    ],
    [
      1,
      0,
      0,
      0
    ]
  ],
  "落子数": [
    7,
    6
  ],
  "黑子数": 6,
  "白子数": 4,
  "黑方目数": 8,
  "白方目数": 5,
  "中立点": 36,
  "胜方": 1,
  "无气块": 0,
  "账目成立": true,
  "面积和等于格数": true,
  "重放不新增": 0,
  "重放报错条数": 0,
  "拆两轮中间态不同": true,
  "拆两轮收尾态一致": true,
  "异常事件数": 0,
  "越界报码": "E_BAD_POINT",
  "自杀死棋报码": "E_SUICIDE",
  "打劫报码": "E_KO",
  "有子报码": "E_OCCUPIED",
  "轮次报码": "E_TURN"
};
function __same(got, want) {
  if (typeof got === "string") {
    try { const parsed = JSON.parse(got); if (JSON.stringify(parsed) === JSON.stringify(want)) return true; } catch (error) { }
  }
  return JSON.stringify(got) === JSON.stringify(want);
}
let __bad = 0;
for (const [label, want] of Object.entries(EXPECTED)) {
  const found = __lines.find((pair) => pair[0] === label);
  if (!found) { __bad += 1; console.log("缺失验收项 " + label); continue; }
  if (__same(found[1], want)) { console.log("一致 " + label + " = " + JSON.stringify(found[1])); }
  else { __bad += 1; console.log("不一致 " + label + " 期望 " + JSON.stringify(want) + " 实际 " + JSON.stringify(found[1])); }
}
console.log("验收项 " + (Object.keys(EXPECTED).length - __bad) + "/" + Object.keys(EXPECTED).length + " 通过");
process.exit(__bad === 0 ? 0 : 1);
