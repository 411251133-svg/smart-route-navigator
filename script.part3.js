async function play(name, result) {
  const token = state.animToken;
  const speed = speedSetting();
  state.layers[name] = [];
  state.paths[name] = [];
  state.show[name] = true;
  draw();
  if (!speed.delay) {
    state.layers[name] = result.visited.slice();
    state.paths[name] = result.path.slice();
    draw();
    return token === state.animToken;
  }
  for (let i = 0; i < result.visited.length; i += speed.batch) {
    if (token !== state.animToken) return false;
    state.layers[name].push(...result.visited.slice(i, i + speed.batch));
    draw();
    await sleep(speed.delay);
  }
  if (token !== state.animToken) return false;
  state.paths[name] = result.path.slice();
  draw();
  return true;
}

function resultLabel(mode, heuristic) {
  return mode === "dijkstra"
    ? "Dijkstra"
    : `A* (${heuristic === "euclidean" ? "Euclidean" : "Manhattan"})`;
}

async function runCurrent() {
  const mode = $("algo").value;
  const heuristic = $("heuristic").value;
  const label = resultLabel(mode, heuristic);
  clearVisuals();
  setPlaying(true);
  setStatus(`Menghitung ${label}...`);
  const result = search(mode, heuristic);
  showMetrics(result);
  if (!await play(mode, result)) return;
  setPlaying(false);
  setStatus(result.path.length
    ? `${label}: biaya ${result.cost}, ${result.explored} node, ${result.ms.toFixed(3)} ms.`
    : `${label}: tidak ada jalur.`);
}

function formatRun(name, result) {
  const cost = Number.isFinite(result.cost) ? result.cost : "tidak ada jalur";
  const steps = result.path.length ? result.path.length - 1 : "-";
  return `${name}\n  waktu: ${result.ms.toFixed(3)} ms\n  node: ${result.explored}\n  biaya: ${cost}\n  langkah: ${steps}`;
}

async function compareRuns() {
  const heuristic = $("heuristic").value;
  const hName = heuristic === "euclidean" ? "Euclidean" : "Manhattan";
  clearVisuals();
  setPlaying(true);
  const astar = search("astar", heuristic);
  const dijkstra = search("dijkstra", heuristic);
  const saved = dijkstra.explored - astar.explored;
  const verdict = Number.isFinite(astar.cost)
    ? `A* mengeksplorasi ${saved} node lebih sedikit. Biaya optimal keduanya ${astar.cost}.`
    : "Tidak ada jalur pada peta ini.";
  $("compareOut").textContent = `${formatRun("A* " + hName, astar)}\n\n${formatRun("Dijkstra", dijkstra)}\n\n${verdict}`;
  showMetrics(astar);
  if (!await play("dijkstra", dijkstra) || !await play("astar", astar)) return;
  setPlaying(false);
  setStatus(`A* ${astar.explored} node (${astar.ms.toFixed(3)} ms), Dijkstra ${dijkstra.explored} node (${dijkstra.ms.toFixed(3)} ms).`);
}

function resizeCanvas() {
  const width = Math.max(320, canvas.parentElement.getBoundingClientRect().width);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(width * (ROWS / COLS) * dpr);
  draw();
}

$("maze").onclick = () => { if (!state.playing) generateMaze(); };
$("clear").onclick = () => {
  if (state.playing) return;
  clearVisuals();
  makeGrid();
  state.start = { c: 4, r: 12 };
  state.goal = { c: 35, r: 12 };
  draw();
  resetMetrics();
  setStatus("Peta dibersihkan.");
};
$("run").onclick = () => { if (!state.playing) runCurrent(); };
$("compare").onclick = () => { if (!state.playing) compareRuns(); };
$("stop").onclick = () => { state.animToken++; setPlaying(false); setStatus("Animasi dihentikan."); };
$("speed").addEventListener("input", updateSpeedLabel);
window.addEventListener("resize", resizeCanvas);
$("stop").disabled = true;
makeGrid();
updateSpeedLabel();
resizeCanvas();
