/** Option data shared by Event select controls and filter sorting. */
export interface EventSelectOption {
  id: number;
  name: string;
  icon: string;
  color: string | null;
  endTime?: Date | string;
}

/** Option data shared by Hero select controls and filter sorting. */
export interface HeroSelectOption {
  id: number;
  name: string;
  level?: number;
}
