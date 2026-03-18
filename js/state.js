/**
 * state.js
 * ────────
 * Single source of truth for all mutable runtime state.
 * Every other module reads/writes through this object so there are no
 * hidden globals scattered across files.
 *
 * Usage:
 *   import { State } from './state.js';   // (if using ES modules)
 *   State.DATA = { ... };
 *   State.activeEdgeFilter = 'citation';
 */

const State = {
  /** @type {object|null} Full dataset returned by startSearch(). */
  DATA: null,

  /** @type {d3.Simulation|null} Active D3 force simulation instance. */
  simulation: null,

  /** @type {'all'|'citation'|'coauthor'} Currently selected edge-type filter. */
  activeEdgeFilter: 'all',

  /** @type {Chart|null} Active Chart.js line chart (keyword trends). */
  trendChart: null,

  /** @type {Chart|null} Active Chart.js bar chart (publications per year). */
  yearChart: null,
};