// @vitest-environment happy-dom

import * as HashMap from "effect/HashMap";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import type { SquadGroupDraft } from "../../-state/squad-group-draft";
import { SquadRosterWorkspace } from "./squad-roster-workspace";
import type { SquadCharacterMetadata } from "./squad-roster-workspace";

const noop = () => {};

const character = (
  characterId: number,
  ownerId: string,
  accountId = characterId
): SquadCharacterMetadata => ({
  accountDisplayName: `Konto ${accountId}`,
  accountId,
  accountOwnerUserId: ownerId,
  accountOwnerUserImage: null,
  accountOwnerUserName: "Ten sam nick",
  avatarUrl: null,
  characterId,
  level: 100,
  name: `Postać ${characterId}`,
  profession: "w",
});

const renderRoster = (
  characters: readonly SquadCharacterMetadata[],
  ids: readonly number[]
) => {
  const draft: SquadGroupDraft = {
    groupId: 1,
    name: "Grupa",
    squads: [
      {
        characters: ids.map((characterId) => ({ characterId })),
        clientKey: "first",
        name: "Skład",
      },
    ],
  };

  const container = document.createElement("div");
  container.innerHTML = renderToStaticMarkup(
    <SquadRosterWorkspace
      characterById={HashMap.fromIterable(
        characters.map((item) => [item.characterId, item] as const)
      )}
      draft={draft}
      canEditPlacements={false}
      isOwner={false}
      isSaving={false}
      onAddSquad={noop}
      onNameChange={noop}
      onRemoveCharacter={noop}
      onRemoveSquad={noop}
    />
  );

  return container;
};

const rowStyle = (container: HTMLElement, name: string) =>
  [...container.querySelectorAll("li")]
    .find((row) => row.textContent?.includes(name))
    ?.getAttribute("style");

describe("SquadRosterWorkspace owner highlighting", () => {
  it("shares a tint across an owner's accounts and matches the legend", () => {
    const container = renderRoster(
      [
        character(1, "owner-a"),
        character(2, "owner-a"),
        character(3, "owner-b"),
      ],
      [1, 2, 3]
    );

    const legend = container.querySelector(
      'ul[aria-labelledby="squad-owners-heading"]'
    );

    expect(legend?.children).toHaveLength(2);
    expect(rowStyle(container, "Postać 1")).toBe(
      rowStyle(container, "Postać 2")
    );
    expect(rowStyle(container, "Postać 1")).not.toBe(
      rowStyle(container, "Postać 3")
    );
    expect(legend?.children[0]?.getAttribute("style")).toBe(
      rowStyle(container, "Postać 1")
    );
    expect(container.textContent).not.toContain("Właściciel:");
    expect(legend?.textContent).toContain("Ten sam nick");
    expect(
      container
        .querySelector("#squad-roster-heading")
        ?.parentElement?.parentElement?.contains(legend)
    ).toBe(true);
  });

  it("only lists placed owners and keeps colors stable when placements change", () => {
    const characters = [character(1, "owner-a"), character(2, "owner-b")];
    const before = renderRoster(characters, [1, 2]);
    const after = renderRoster(characters, [2, 999]);
    expect(
      after.querySelector('ul[aria-labelledby="squad-owners-heading"]')
        ?.children
    ).toHaveLength(1);
    expect(rowStyle(before, "Postać 2")).toBe(rowStyle(after, "Postać 2"));
    expect(after.textContent).toContain("Niedostępna postać");
    expect(
      after
        .querySelector('li[aria-label="Wolne miejsce 3"]')
        ?.hasAttribute("style")
    ).toBe(false);
  });

  it("spaces three owners evenly around the color wheel regardless of input order", () => {
    const characters = [
      character(1, "owner-a"),
      character(2, "owner-b"),
      character(3, "owner-c"),
    ];

    const container = renderRoster(characters, [1, 2, 3]);
    const reordered = renderRoster(characters.toReversed(), [3, 2, 1]);

    for (const [index, hue] of [250, 10, 130].entries()) {
      const name = `Postać ${index + 1}`;
      expect(rowStyle(container, name)).toContain(`oklch(65% 0.2 ${hue})`);
      expect(rowStyle(container, name)).toBe(rowStyle(reordered, name));
    }
  });

  it("omits the legend for empty squads", () => {
    const container = renderRoster([character(1, "owner-a")], []);
    expect(
      container.querySelector('ul[aria-labelledby="squad-owners-heading"]')
    ).toBeNull();
  });
});
