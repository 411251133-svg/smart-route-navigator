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

canvas = document.getElementById("map");