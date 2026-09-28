// board.js：点位、四邻、棋块、气与点目
export function pointOf(text) {
  if (typeof text !== "string") { return []; }
  const match = /^([A-Z])([0-9]+)$/.exec(text.trim());
  if (!match) { return []; }
  const col = match[1].charCodeAt(0) - 64;
  const row = parseInt(match[2], 10);
  if (row < 1) { return []; }
  return [row, col];
}

export function neighbours(size, row, col) {
  if (row < 1 || row > size || col < 1 || col > size) { return []; }
  const out = [];
  if (row > 1) { out.push([row - 1, col]); }
  if (col > 1) { out.push([row, col - 1]); }
  if (col < size) { out.push([row, col + 1]); }
  if (row < size) { out.push([row + 1, col]); }
  return out;
}

export function groupOf(board, row, col) {
  const size = board.length;
  if (row < 1 || row > size || col < 1 || col > size) { return []; }
  const color = (board[row - 1] || [])[col - 1];
  if (color !== 1 && color !== 2) { return []; }
  const seen = new Set([row + "," + col]);
  const queue = [[row, col]];
  const group = [];
  while (queue.length > 0) {
    const [atRow, atCol] = queue.shift();
    group.push([atRow, atCol]);
    for (const [nextRow, nextCol] of neighbours(size, atRow, atCol)) {
      const key = nextRow + "," + nextCol;
      if (seen.has(key)) { continue; }
      if (board[nextRow - 1][nextCol - 1] !== color) { continue; }
      seen.add(key);
      queue.push([nextRow, nextCol]);
    }
  }
  group.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
  return group;
}

export function liberties(board, row, col) {
  const group = groupOf(board, row, col);
  if (group.length === 0) { return 0; }
  const size = board.length;
  const libs = new Set();
  for (const [atRow, atCol] of group) {
    for (const [nextRow, nextCol] of neighbours(size, atRow, atCol)) {
      if (board[nextRow - 1][nextCol - 1] === 0) {
        libs.add(nextRow + "," + nextCol);
      }
    }
  }
  return libs.size;
}

export function areaOf(board) {
  const size = board.length;
  let black = 0;
  let white = 0;
  let neutral = 0;
  const seen = new Set();
  for (let row = 1; row <= size; row += 1) {
    for (let col = 1; col <= size; col += 1) {
      const value = board[row - 1][col - 1];
      if (value === 1) { black += 1; continue; }
      if (value === 2) { white += 1; continue; }
      const key = row + "," + col;
      if (seen.has(key)) { continue; }
      seen.add(key);
      const region = [];
      const touches = new Set();
      const queue = [[row, col]];
      while (queue.length > 0) {
        const [atRow, atCol] = queue.shift();
        region.push([atRow, atCol]);
        for (const [nextRow, nextCol] of neighbours(size, atRow, atCol)) {
          const near = board[nextRow - 1][nextCol - 1];
          if (near === 0) {
            const nearKey = nextRow + "," + nextCol;
            if (!seen.has(nearKey)) {
              seen.add(nearKey);
              queue.push([nextRow, nextCol]);
            }
          } else {
            touches.add(near);
          }
        }
      }
      if (touches.size === 1) {
        if (touches.has(1)) { black += region.length; } else { white += region.length; }
      } else {
        neutral += region.length;
      }
    }
  }
  return [black, white, neutral];
}
