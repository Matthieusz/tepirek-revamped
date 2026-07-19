import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HeroBetMemberPicker } from "@/features/events/bets/hero-bet-member-picker";
import { HeroCardsGrid } from "@/features/events/bets/hero-cards-grid";

const users = [
  { id: "u1", image: null, name: "Ala" },
  { id: "u2", image: null, name: "Olek" },
];

describe("custom picker fields", () => {
  it("wires hero selection to the form field and exposes pressed state", () => {
    const markup = renderToStaticMarkup(
      <HeroCardsGrid
        fieldName="heroId"
        heroes={[
          {
            id: 7,
            image: "https://example.com/smok.png",
            level: 120,
            name: "Smok",
          },
        ]}
        onBlur={() => {}}
        onSelectHero={() => {}}
        selectedHeroId="7"
      />
    );

    expect(markup).toContain('name="heroId"');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('alt="Smok"');
  });

  it("keeps member selection controls named and exposes selected users", () => {
    const markup = renderToStaticMarkup(
      <HeroBetMemberPicker
        clearEnabled
        fieldName="userIds"
        idPrefix="members"
        onBlur={() => {}}
        onChange={() => {}}
        selectedUserIds={["u1"]}
        users={users}
        usersLoading={false}
        variant="add"
      />
    );

    expect(markup).toContain('name="userIds"');
    expect(markup).toContain("Gracze (1 wybranych)");
    expect(markup).toContain('id="selected-members-u1"');
    expect(markup).toContain('id="members-u2"');
  });
});
