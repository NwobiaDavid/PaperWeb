// lib/types.ts
// ─────────────────────────────────────────────────────────────────────────────
// All TypeScript interfaces / type aliases shared across the application.

export interface Paper {
  id:         string;
  title:      string;
  abstract:   string;
  year:       number;
  authors:    string[];
  categories: string[];
  citations:  number;
  degree:     number;
  url:        string;
}

export interface Edge {
  source: string;
  target: string;
  type:   'citation' | 'coauthor';
  weight: number;
}

export interface TrendSeries {
  years:  number[];
  series: Record<string, Record<number, number>>;
}

export interface AppData {
  meta: {
    node_count: number;
    edge_count: number;
    generated:  string;
    topic:      string;
  };
  nodes:  Paper[];
  edges:  Edge[];
  trends: TrendSeries;
}

export type EdgeFilter = 'all' | 'citation' | 'coauthor';

export interface LoadingState {
  active: boolean;
  text:   string;
  sub:    string;
}