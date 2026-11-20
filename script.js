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
  layers 