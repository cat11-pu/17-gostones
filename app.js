// app.js：把一段棋谱事件流跑成复盘视图（盘面、提子、目数、记录与不变量）
import { pointOf, neighbours, groupOf, liberties, areaOf } from "./board.js";
import { play, pass } from "./rules.js";

function copyState(state) {
  return {
    size: state.size,
    board: (state.board || []).map(function (row) { return row.slice(); }),
    toMove: state.toMove,
    captures: (state.captures || [0, 0]).slice(),
    koPoint: (state.koPoint || [0, 0]).slice(),
    passStreak: state.passStreak || 0,
    finished: !!state.finished,
    moves: (state.moves || []).map(function (row) { return row.slice(); }),
    placed: (state.placed || [0, 0]).slice()
  };
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

function runFrom(state, events) {
  let current = state;
  let failed = 0;
  const marks = [];
  for (const event of events || []) {
    try {
      current = step(current, event);
    } catch (error) {
      failed += 1;
      marks.push([event.kind, error && error.code ? error.code : "E_BAD_EVENT"]);
    }
  }
  return [current, failed, marks];
}

function fingerprint(state) {
  return JSON.stringify({ board: state.board, toMove: state.toMove, captures: state.captures,
                          koPoint: state.koPoint, passStreak: state.passStreak,
                          finished: state.finished, moves: state.moves, placed: state.placed });
}

export function render(spec) {
  const run = runFrom(copyState(spec.state), spec.events || []);
  const state = run[0];
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
      if (!board[row - 1] || board[row - 1][col - 1] === 0 || board[row - 1][col - 1] === undefined) {
        continue;
      }
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
  const half = Math.ceil((spec.events || []).length / 2);
  const left = runFrom(copyState(spec.state), (spec.events || []).slice(0, half))[0];
  const midPrint = fingerprint(left);
  const right = runFrom(left, (spec.events || []).slice(half))[0];
  const once = runFrom(copyState(spec.state), spec.events || []);
  const replay = runFrom(copyState(spec.state), spec.events || []);
  const spot = pointOf("D4");
  return {
    board: board.map(function (row) { return row.slice(); }),
    toMove: state.toMove,
    captures: captures.slice(),
    koPoint: (state.koPoint || [0, 0]).slice(),
    finished: !!state.finished,
    move_count: (state.moves || []).length,
    moves: (state.moves || []).map(function (row) { return row.slice(); }),
    placed: placed.slice(),
    black_stones: blackStones,
    white_stones: whiteStones,
    area: area.slice(),
    winner: winner,
    dead_blocks: deadBlocks,
    ledger: ledger,
    sum_ok: sum === state.size * state.size,
    replay_new: fingerprint(replay[0]) === fingerprint(state) ? 0 : 1,
    replay_failed: replay[1],
    mid_differs: midPrint !== fingerprint(state),
    split_equal: fingerprint(right) === fingerprint(once[0]) && once[1] === 0,
    failed_events: run[1],
    failed_marks: run[2],
    count_events: (spec.events || []).length,
    tail: spot.length + neighbours(state.size, 1, 1).length + areaOf(board).length
  };
}
