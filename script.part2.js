  if (state.movedTerminal || state.grid[cell.r][cell.c] === WALL) return;
  state.movedTerminal = true;
  const target = state.tool === "start" ? "start" : "goal";
  const other = target === "start" ? state.goal : state.start;
  if (sameCell(other, cell) || sameCell(state[target], cell)) return;
  state[target] = { c: cell.c, r: cell.r };
  clearVisuals();
  draw();
}

function applyTool(cell) {
  if (!cell) return;
  if (state.tool === "start" || state.tool === "goal") {
    moveTerminal(cell);
    return;
  }
  if (state.paintValue == null || isStart(cell.c, cell.r) || isGoal(cell.c, cell.r)) return;
  if (state.grid[cell.r][cell.c] === state.paintValue) return;
  state.grid[cell.r][cell.c] = state.paintValue;
  clearVisuals();
  draw();
}

function stopPainting(event) {
  state.painting = false;
  state.paintValue = null;
  state.movedTerminal = false;
  if (event && canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
}

canvas.addEventListener("pointerdown", (event) => {
  if (state.playing || event.button !== 0) return;
  canvas.setPointerCapture(event.pointerId);
  state.painting = true;
  state.movedTerminal = false;
  state.paintValue = state.tool === "traffic" ? TRAFFIC : state.tool === "erase" ? EMPTY : state.tool === "wall" ? WALL : null;
  applyTool(pointerCell(event));
});
canvas.addEventListener("pointermove", (event) => {
  if (!state.painting) return;
  applyTool(pointerCell(event));
});
canvas.addEventListener("pointerup", stopPainting);
canvas.addEventListener("pointercancel", stopPainting);
canvas.addEventListener("lostpointercapture", () => { state.painting = false; state.paintValue = null; });

$("tools").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-tool]");
  if (!button || state.playing) return;
  state.tool = button.dataset.tool;
  document.querySelectorAll("#tools button[data-tool]").forEach((item) => {
    item.setAttribute("aria-pressed", String(item === button));
  });
});

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function generateMaze() {
  clearVisuals();
  state.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(WALL));
  const stack = [{ c: 1, r: 1 }];
  state.grid[1][1] = EMPTY;
  while (stack.length) {
    const current = stack[stack.length - 1];
    const options = DIRS.map(([dc, dr]) => ({
      c: current.c + dc * 2,
      r: current.r + dr * 2,
      dc,
      dr
    }));
    const next = shuffle(options).find((cell) => (
      cell.c > 0 && cell.r > 0 && cell.c < COLS - 1 && cell.r < ROWS - 1 &&
      state.grid[cell.r][cell.c] === WALL
    ));
    if (!next) { stack.pop(); continue; }
    state.grid[current.r + next.dr][current.c + next.dc] = EMPTY;
    state.grid[next.r][next.c] = EMPTY;
    stack.push(next);
  }
  for (let r = 1; r < ROWS - 1; r++) {
    for (let c = 1; c < COLS - 1; c++) {
      if (state.grid[r][c] === EMPTY && Math.random() < .16) state.grid[r][c] = TRAFFIC;
    }
  }
  state.start = { c: 1, r: 1 };
  state.goal = { c: COLS - 2, r: ROWS - 2 };
  state.grid[state.start.r][state.start.c] = EMPTY;
  state.grid[state.goal.r][state.goal.c] = EMPTY;
  draw();
  resetMetrics();
  setStatus("Maze terhubung dibuat. Jalur dari start ke goal selalu ada.");
}

function setStatus(text) { $("status").textContent = text; }

function setPlaying(playing) {
  state.playing = playing;
  ["run", "compare", "maze", "clear", "algo", "heuristic"].forEach((id) => { $(id).disabled = playing; });
  document.querySelectorAll("#tools button").forEach((button) => { button.disabled = playing; });
  $("stop").disabled = !playing;
}

function showMetrics(result) {
  $("ms").textContent = `${result.ms.toFixed(3)} ms`;
  $("visited").textContent = String(result.explored);
  $("cost").textContent = Number.isFinite(result.cost) ? String(result.cost) : "-";
  $("steps").textContent = result.path.length ? String(result.path.length - 1) : "-";
}

function resetMetrics() {
  ["ms", "visited", "cost", "steps"].forEach((id) => { $(id).textContent = "-"; });
  $("compareOut").textContent = "Jalankan perbandingan untuk melihat kedua algoritma pada peta yang sama.";
}

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function speedSetting() { return SPEEDS[Number($("speed").value)] || SPEEDS[1]; }

function updateSpeedLabel() {
  const speed = speedSetting();
  $("speedLabel").textContent = speed.label;
  $("speedValue").textContent = speed.delay ? `${speed.batch} sel/frame` : "tanpa animasi";
}
