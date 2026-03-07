export type SurahFilterDto =
  | { kind: 'range'; start: number; end: number }
  | { kind: 'set'; set: Set<number> };