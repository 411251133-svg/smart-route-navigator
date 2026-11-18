"use strict";

const COLS = 40;
const ROWS = 25;
const EMPTY = 0;
const WALL = 1;
const TRAFFIC = 2;
const SPEEDS = [
  { label: "Instan", batch: Infinity, delay: 0 },
  { label: "Cepat", batch: 12, delay: 16 },
  { label: "Sedang", batch: 3, delay: 28 },
  { label: "Lambat", batch: 1, delay: 48 }
];

const canvas = document.getElementById("map");
const ctx = canvas.getContext("2d");
const $ = (id) => document.getElementById(id);

const state = {
  grid: [],
  start: { c: 4, r: 12 },
  goal: { c: 35, r: 12 },
  tool: "wall",
  painting: false,
  paintValue: null,
  movedTerminal: false,
  layers: { astar: [], dijkstra: [] },
  paths: { astar: [], dijkstra: [] },
  show: { astar: false, dijkstra: false },
  animToken: 0,
  playing: false
};

function makeGrid() {
  state.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));
}

/* MinHeap: binary priority queue.
   insert and extractMin are both O(log N). No Array.prototype.sort. */
class MinHeap {
  constructor() { this.data = []; }
  get size() { return this.data.length; }
  isEmpty() { return this.data.length === 0; }

  insert(item) {
    this.data.push(item);
    this.#bubbleUp(this.data.length - 1);
  }

  extractMin() {
    if (this.isEmpty()) return null;
    const min = this.data[0];
    const last = this.data.pop();
    if (this.data.length) {
      this.data[0] = last;
      this.#sinkDown(0);
    }
    return min;
  }

  #bubbleUp(index) {
    const data = this.data;
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (data[parent].key <= data[index].key) break;
      [data[parent], data[index]] = [data[index], data[parent]];
      index = parent;
    }
  }

  #sinkDown(index) {
    const data = this.data;
    const n = data.length;
    while (true) {
      let smallest = index;
      const left = index * 2 + 1;
      const right = left + 1;
      if (left < n && data[left].key < data[smallest].key) smallest = left;
      if (right < n && data[right].key < data[smallest].key) smallest = right;
      if (smallest === index) break;
      [data[index], data[smallest]] = [data[smallest], data[index]];
      index = smallest;
    }
  }
}

const keyOf = (c, r) => r * COLS + c;
const cellCost = (c, r) => (state.grid[r][c] === TRAFFIC ? 5 : 1);
const manhattan = (a, b) => Math.abs(a.c - b.c) + Math.abs(a.r - b.r);
const euclidean = (a, b) => Math.hypot(a.c - b.c, a.r - b.r);
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function neighbors(c, r) {
  const out = [];
  for (const [dc, dr] of DIRS) {
    const nc = c + dc;
    const nr = r + dr;
    if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
    if (state.grid[nr][nc] === WALL) continue;
    out.push({ c: nc, r: nr });
  }
  return out;
}

/* A* uses f = g + h. Dijkstra uses h = 0.
   Equal f prefers the smaller h so A* expands toward the goal.
   Stale heap entries are ignored through the closed set. */
function search(mode, heuristicName) {
  const hFn = heuristicName === "euclidean" ? euclidean : manhattan;
  const start = state.start;
  const goal = state.goal;
  const startId = keyOf(start.c, start.r);
  const goalId = keyOf(goal.c, goal.r);
  const gScore = new Float64Array(COLS * ROWS);
  gScore.fill(Infinity);
  gScore[startId] = 0;
  const cameFrom = new Int32Array(COLS * ROWS);
  cameFrom.fill(-1);
  const closed = new Uint8Array(COLS * ROWS);
  const heap = new MinHeap();
  const h0 = mode === "astar" ? hFn(start, goal) : 0;
  heap.insert({ key: h0, h: h0, id: startId, c: start.c, r: start.r });

  const visited = [];
  let found = false;
  const started = performance.now();
  while (!heap.isEmpty()) {
    const current = heap.extractMin();
    if (closed[current.id]) continue;
    closed[current.id] = 1;
    visited.push({ c: current.c, r: current.r });
    if (current.id === goalId) { found = true; break; }
    for (const next of neighbors(current.c, current.r)) {
      const nid = keyOf(next.c, next.r);
      if (closed[nid]) continue;
      const tentative = gScore[current.id] + cellCost(next.c, next.r);
      if (tentative >= gScore[nid]) continue;
      gScore[nid] = tentative;
      cameFrom[nid] = current.id;
      const h = mode === "astar" ? hFn(next, goal) : 0;
      heap.insert({ key: tentative + h + h * 1e-4, h, id: nid, c: next.c, r: next.r });
    }
  }
  const ms = performance.now() - started;

  const path = [];
  if (found) {
    let cursor = goalId;
    while (cursor !== -1) {
      path.push({ c: cursor % COLS, r: (cursor / COLS) | 0 });
      cursor = cameFrom[cursor];
    }
    path.reverse();
  }
  let explored = 0;
  for (let i = 0; i < closed.length; i++) explored += closed[i];
  return { visited, path, explored, cost: found ? gScore[goalId] : Infinity, ms };
}

function cellSize() {
  return { w: canvas.width / COLS, h: canvas.height / ROWS };
}

function sameCell(a, b) { return a.c === b.c && a.r === b.r; }
function isStart(c, r) { return c === state.start.c && r === state.start.r; }
function isGoal(c, r) { return c === state.goal.c && r === state.goal.r; }

function drawCell(c, r, color) {
  const { w, h } = cellSize();
  ctx.fillStyle = color;
  ctx.fillRect(c * w, r * h, w + .5, h + .5);
}

function draw() {
  const { w, h } = cellSize();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const kind = state.grid[r][c];
      const color = kind === WALL ? "#31425f" : kind === TRAFFIC ? "#8a5a28" : ((r + c) % 2 ? "#101828" : "#121a2d");
      drawCell(c, r, color);
    }
  }

  const paintLayer = (name, color) => {
    if (!state.show[name]) return;
    ctx.fillStyle = color;
    for (const cell of state.layers[name]) {
      if (isStart(cell.c, cell.r) || isGoal(cell.c, cell.r)) continue;
      ctx.globalAlpha = state.grid[cell.r][cell.c] === TRAFFIC ? .55 : .82;
      ctx.fillRect(cell.c * w + 1, cell.r * h + 1, Math.max(1, w - 2), Math.max(1, h - 2));
    }
    ctx.globalAlpha = 1;
  };
  paintLayer("dijkstra", "#245f73");
  paintLayer("astar", "#2f6fbe");

  const paintPath = (name, color) => {
    const path = state.paths[name];
    if (!state.show[name] || path.length < 2) return;
    ctx.beginPath();
    path.forEach((cell, index) => {
      const x = cell.c * w + w / 2;
      const y = cell.r * h + h / 2;
      if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, Math.min(w, h) * (name === "astar" ? .25 : .14));
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  };
  paintPath("dijkstra", "#7ee0c8");
  paintPath("astar", "#f4d35e");

  ctx.strokeStyle = "rgba(232,238,252,.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = 0; c <= COLS; c++) { ctx.moveTo(c * w + .5, 0); ctx.lineTo(c * w + .5, canvas.height); }
  for (let r = 0; r <= ROWS; r++) { ctx.moveTo(0, r * h + .5); ctx.lineTo(canvas.width, r * h + .5); }
  ctx.stroke();
  drawMarker(state.start, "#3dd68c", "S");
  drawMarker(state.goal, "#ff5d73", "G");
}

function drawMarker(cell, color, label) {
  const { w, h } = cellSize();
  const x = cell.c * w;
  const y = cell.r * h;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 2, w - 4, h - 4, 4);
  ctx.fill();
  ctx.fillStyle = "#081018";
  ctx.font = `700 ${Math.max(9, Math.floor(Math.min(w, h) * .48))}px Segoe UI, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + w / 2, y + h / 2 + .5);
}

function pointerCell(event) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const x = (event.clientX - rect.left) * (canvas.width / rect.width);
  const y = (event.clientY - rect.top) * (canvas.height / rect.height);
  const c = Math.floor(x / (canvas.width / COLS));
  const r = Math.floor(y / (canvas.height / ROWS));
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return null;
  return { c, r };
}

function clearVisuals() {
  state.animToken++;
  state.layers.astar = [];
  state.layers.dijkstra = [];
  state.paths.astar = [];
  state.paths.dijkstra = [];
  state.show.astar = false;
  state.show.dijkstra = false;
}

function moveTerminal(cell) {
