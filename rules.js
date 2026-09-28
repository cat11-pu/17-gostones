// rules.js：落子与虚手（不改传入状态，返回新状态）
import { pointOf, neighbours, groupOf, liberties } from "./board.js";

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function cloneState(state) {
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

function checkTurn(state, color) {
  if (color !== 1 && color !== 2) { fail("E_BAD_COLOR"); }
  if (state.finished) { fail("E_FINISHED"); }
  if (color !== state.toMove) { fail("E_TURN"); }
}

export function play(state, color, point) {
  checkTurn(state, color);
  const spot = pointOf(point);
  if (spot.length === 0) { fail("E_BAD_POINT"); }
  const row = spot[0];
  const col = spot[1];
  const size = state.size;
  if (row < 1 || row > size || col < 1 || col > size) { fail("E_BAD_POINT"); }
  if (state.board[row - 1][col - 1] !== 0) { fail("E_OCCUPIED"); }
  const ko = state.koPoint || [0, 0];
  if (ko[0] === row && ko[1] === col) { fail("E_KO"); }

  const next = cloneState(state);
  next.board[row - 1][col - 1] = color;
  const rival = color === 1 ? 2 : 1;
  let taken = 0;
  const takenPoints = [];
  for (const [nearRow, nearCol] of neighbours(size, row, col)) {
    if (next.board[nearRow - 1][nearCol - 1] !== rival) { continue; }
    if (liberties(next.board, nearRow, nearCol) !== 0) { continue; }
    for (const [deadRow, deadCol] of groupOf(next.board, nearRow, nearCol)) {
      next.board[deadRow - 1][deadCol - 1] = 0;
      taken += 1;
      takenPoints.push([deadRow, deadCol]);
    }
  }
  if (liberties(next.board, row, col) === 0) { fail("E_SUICIDE"); }

  next.captures[color - 1] += taken;
  next.placed[color - 1] += 1;
  next.moves.push([color, row, col, taken]);
  next.passStreak = 0;
  if (taken === 1 &&
      groupOf(next.board, row, col).length === 1 &&
      liberties(next.board, row, col) === 1) {
    next.koPoint = takenPoints[0].slice();
  } else {
    next.koPoint = [0, 0];
  }
  next.toMove = rival;
  return next;
}

export function pass(state, color) {
  checkTurn(state, color);
  const next = cloneState(state);
  next.moves.push([color, 0, 0, 0]);
  next.passStreak = (state.passStreak || 0) + 1;
  if (next.passStreak >= 2) { next.finished = true; }
  next.toMove = color === 1 ? 2 : 1;
  return next;
}
