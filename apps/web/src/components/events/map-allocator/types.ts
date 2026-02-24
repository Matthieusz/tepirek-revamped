// ── Types ───────────────────────────────────────────────────────────────────

export type MapEntry = {
  name: string;
  prefix: "-" | "•";
};

export type MapSection = {
  label: string | null;
  maps: MapEntry[];
};

export type HeroMapPreset = {
  heroName: string;
  sections: MapSection[];
};

export type VerifiedUser = {
  id: string;
  name: string;
  image: string | null;
};

export type Position = { x: number; y: number };

// ── Constants ───────────────────────────────────────────────────────────────

export const MAP_CARD_W = 190;
export const MAP_CARD_H = 90;
export const GRID_GAP = 16;
export const GRID_COLS = 5;
export const CANVAS_MIN_H = 700;

// ── Hardcoded presets ───────────────────────────────────────────────────────

export const HERO_PRESETS: HeroMapPreset[] = [
  {
    heroName: "Przykładowy Heros",
    sections: [
      {
        label: null,
        maps: [
          { name: "Chodniki Mrinding p.1 - sala 1", prefix: "-" },
          { name: "Chodniki Mrinding p.1 - sala 2", prefix: "-" },
          { name: "Chodniki Mrinding p.2 - sala 1", prefix: "-" },
          { name: "Chodniki Mrinding p.2 - sala 2", prefix: "-" },
          { name: "Ścieżki Erebeth p.2 - sala 1", prefix: "-" },
          { name: "Ścieżki Erebeth p.2 - sala 2", prefix: "-" },
          { name: "Ścieżki Erebeth p.3", prefix: "-" },
          { name: "Kuźnia Worundriela p.1", prefix: "-" },
          { name: "Kuźnia Worundriela p.2", prefix: "-" },
          { name: "Kuźnia Worundriela p.3", prefix: "-" },
          { name: "Ognista Studnia p.1", prefix: "-" },
          { name: "Ognista Studnia p.2", prefix: "-" },
          { name: "Ognista Studnia p.3", prefix: "-" },
        ],
      },
      {
        label: "Okolice Werbin:",
        maps: [
          { name: "Zaginiona Dolina", prefix: "•" },
          { name: "Opuszczona Twierdza", prefix: "•" },
          { name: "Mała Twierdza - sala wejściowa", prefix: "-" },
          { name: "Mała Twierdza - magazyn", prefix: "-" },
          { name: "Mała Twierdza - korytarz zachodni", prefix: "-" },
          { name: "Mała Twierdza - mury zachodnie", prefix: "-" },
          { name: "Mała Twierdza p.1", prefix: "-" },
          { name: "Mała Twierdza - mury wschodnie", prefix: "-" },
          { name: "Czarcie Oparzeliska", prefix: "•" },
          { name: "Grobowiec Przodków", prefix: "•" },
          { name: "Cenotaf Berserkerów p.1 - sala 1", prefix: "-" },
        ],
      },
    ],
  },
];
