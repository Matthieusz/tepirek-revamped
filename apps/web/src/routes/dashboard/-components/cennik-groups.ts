import type { LegendPrice } from "@/features/legend-pricing/legend-pricing-atoms";

/** URL-backed filters supported by the legend price list. */
export interface CennikFilters {
  readonly itemLevel?: string | undefined;
  readonly itemName?: string | undefined;
  readonly monsterName?: string | undefined;
  readonly monsterType?: LegendPrice["enemies"][number]["category"] | undefined;
}

/** One monster and every matching legendary item it drops. */
export interface LegendPriceGroup {
  readonly enemy: LegendPrice["enemies"][number];
  readonly items: readonly LegendPrice[];
}

interface MutableLegendPriceGroup {
  readonly enemy: LegendPrice["enemies"][number];
  readonly items: LegendPrice[];
}

const normalizeSearchTerm = (value: string | undefined): string =>
  value?.trim().toLocaleLowerCase("pl") ?? "";

const parseItemLevel = (value: string | undefined): number | undefined => {
  if (value === undefined || value.trim() === "") {
    return undefined;
  }

  const level = Number(value);
  return Number.isSafeInteger(level) && level > 0 ? level : undefined;
};

/**
 * Filter legendary items and group them by each monster that drops them.
 *
 * An item with multiple drop sources appears once in every matching monster group.
 */
export const groupLegendPricesByEnemy = (
  prices: readonly LegendPrice[],
  filters: CennikFilters
): readonly LegendPriceGroup[] => {
  const itemName = normalizeSearchTerm(filters.itemName);
  const monsterName = normalizeSearchTerm(filters.monsterName);
  const itemLevel = parseItemLevel(filters.itemLevel);
  const groupsByEnemyId = new Map<
    LegendPrice["enemies"][number]["id"],
    MutableLegendPriceGroup
  >();

  for (const item of prices) {
    const matchesItemName =
      itemName.length === 0 ||
      item.name.toLocaleLowerCase("pl").includes(itemName);
    const matchesItemLevel =
      itemLevel === undefined || item.level === itemLevel;

    if (!(matchesItemName && matchesItemLevel)) {
      continue;
    }

    for (const enemy of item.enemies) {
      const matchesMonsterName =
        monsterName.length === 0 ||
        enemy.name.toLocaleLowerCase("pl").includes(monsterName);
      const matchesMonsterType =
        filters.monsterType === undefined ||
        enemy.category === filters.monsterType;
      if (!(matchesMonsterName && matchesMonsterType)) {
        continue;
      }

      const existingGroup = groupsByEnemyId.get(enemy.id);
      if (existingGroup === undefined) {
        groupsByEnemyId.set(enemy.id, { enemy, items: [item] });
      } else if (
        !existingGroup.items.some(
          (existingItem) => existingItem.itemId === item.itemId
        )
      ) {
        existingGroup.items.push(item);
      }
    }
  }

  return [...groupsByEnemyId.values()]
    .map(({ enemy, items }) => ({
      enemy,
      items: items.toSorted(
        (left, right) =>
          left.level - right.level || left.name.localeCompare(right.name, "pl")
      ),
    }))
    .toSorted(
      (left, right) =>
        left.enemy.level - right.enemy.level ||
        left.enemy.name.localeCompare(right.enemy.name, "pl")
    );
};
