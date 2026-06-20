import { POINTS_PER_HERO } from "@tepirek-revamped/config";

export const calculatePointsPerMember = (memberCount: number): number =>
  Math.floor((POINTS_PER_HERO / memberCount) * 100) / 100;
