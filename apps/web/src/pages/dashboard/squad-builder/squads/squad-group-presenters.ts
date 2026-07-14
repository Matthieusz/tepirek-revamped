import type { SharedSquadGroupSummarySchema } from "@tepirek-revamped/api/protocol/squad-builder/squad-group-sharing/squad-group-sharing-schema";

import type {
  GlobalSquadGroupSummary,
  SquadGroupSummary,
} from "@/lib/squad-builder/squad-group-atoms";
import { formatDateTime } from "@/lib/utils";

type SharedSquadGroupSummary = typeof SharedSquadGroupSummarySchema.Type;

export type SquadGroupListItem =
  | {
      readonly kind: "mine";
      readonly group: SquadGroupSummary;
      readonly status: "właściciel";
    }
  | {
      readonly kind: "shared";
      readonly group: SharedSquadGroupSummary;
      readonly status: "edytor";
    }
  | {
      readonly kind: "public";
      readonly group: GlobalSquadGroupSummary;
      readonly status: "publiczny";
    };

export const userInitials = (name: string): string =>
  name
    .split(/\s+/u)
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

const pluralize = (
  count: number,
  singular: string,
  few: string,
  many: string
): string => {
  if (count === 1) {
    return singular;
  }
  if (count < 5) {
    return few;
  }
  return many;
};

export const formatCharacterCount = (count: number): string =>
  `${count} ${pluralize(count, "postać", "postacie", "postaci")}`;

export const formatSquadCount = (count: number): string =>
  `${count} ${pluralize(count, "skład", "składy", "składów")}`;

export const formatGroupUpdatedAt = (date: Date): string =>
  formatDateTime(date);

export const toMineListItem = (
  group: SquadGroupSummary
): SquadGroupListItem => ({
  group,
  kind: "mine",
  status: "właściciel",
});

export const toSharedListItem = (
  group: SharedSquadGroupSummary
): SquadGroupListItem => ({
  group,
  kind: "shared",
  status: "edytor",
});

export const toPublicListItem = (
  group: GlobalSquadGroupSummary
): SquadGroupListItem => ({
  group,
  kind: "public",
  status: "publiczny",
});
