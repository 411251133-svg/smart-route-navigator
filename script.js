"use strict";
const canvas = document.getElementById("map");
const ctx = canvas.getContext("2d");
const cols = 40, rows = 25;
function draw() {
  const box = canvas.parentElement.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(320, Math.round(box.width * dpr));
  canvas.height = Math.round(canvas.width * rows / cols);
  const w = canvas.width / cols, h = canvas.height / rows;
  ctx.fillStyle = "#0d1427";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "rgba(232,238,252,.12)";
  ctx.lineWidth = 1;
  for (let c = 0; c <= cols; c++) { ctx.beginPath(); ctx.moveTo(c*w,0); ctx.lineTo(c*w,canvas.height); ctx.stroke(); }
  for (let r = 0; r <= rows; r++) { ctx.beginPath(); ctx.moveTo(0,r*h); ctx.lineTo(canvas.width,r*h); ctx.stroke(); }
  for (const [c,r,color,label] of [[4,12,"#3dd68c","S"],[35,12,"#ff5d73","G"]]) {
    ctx.fillStyle=color; ctx.beginPath(); ctx.arc((c+.5)*w,(r+.5)*h,Math.max(5,Math.min(w,h)*.36),0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#081018"; ctx.font=`700 ${Math.max(9,Math.min(w,h)*.48)}px sans-serif`; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText(label,(c+.5)*w,(r+.5)*h);
  }
}
window.addEventListener("resize", draw);
draw();