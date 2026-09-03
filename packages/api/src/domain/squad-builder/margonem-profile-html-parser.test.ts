import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import { describe } from "vitest";

import { parseMargonemProfileHtml } from "./margonem-profile-html-parser.ts";
import { parseMargonemProfileId } from "./margonem-profile-id.ts";

describe("Margonem profile HTML parser", () => {
  it.effect("returns a typed parser failure when profile name is missing", () =>
    Effect.gen(function* profileNameMissing() {
      const profileId = yield* parseMargonemProfileId(7_298_897);
      const error = yield* parseMargonemProfileHtml({
        html: '<html><body><li class="char-row"></li></body></html>',
        profileId,
      }).pipe(Effect.flip);

      expect(error._tag).toBe("MargonemProfileNameNotFound");
    })
  );

  it.effect("returns a typed failure for a malformed numeric entity", () =>
    Effect.gen(function* malformedNumericEntity() {
      const profileId = yield* parseMargonemProfileId(7_298_897);
      const error = yield* parseMargonemProfileHtml({
        html: `
          <div class="profile-header__name"><span>Informati &#oops;</span></div>
          <li class="char-row"></li>
        `,
        profileId,
      }).pipe(Effect.flip);

      expect(error._tag).toBe("MargonemProfileNameNotFound");
    })
  );

  it.effect("returns a typed failure for an out-of-range numeric entity", () =>
    Effect.gen(function* outOfRangeNumericEntity() {
      const profileId = yield* parseMargonemProfileId(7_298_897);
      const error = yield* parseMargonemProfileHtml({
        html: `
          <div class="profile-header__name"><span>Informati</span></div>
          <li class="char-row" data-world="#jaruna" data-id="123" data-nick="Hero &#1114112;" data-lvl="150">
            <span class="character-prof">Mag</span>
          </li>
        `,
        profileId,
      }).pipe(Effect.flip);

      expect(error._tag).toBe("MargonemCharacterRowInvalid");
      if (error._tag === "MargonemCharacterRowInvalid") {
        expect(error.safeReason).toBe("invalid numeric HTML entity");
      }
    })
  );

  it.effect("uses DOM structure instead of attribute formatting", () =>
    Effect.gen(function* parseDomStructure() {
      const profileId = yield* parseMargonemProfileId(7_298_897);
      const parsed = yield* parseMargonemProfileHtml({
        html: `
          <section class='profile-header__name'><div><span>Informati</span></div></section>
          <ol>
            <li data-lvl='150' class='char-row extra-class' data-nick='Hero &amp; One' data-id='123' data-world='#jaruna'>
              <span class='character-prof'><strong>Mag</strong></span>
            </li>
          </ol>
        `,
        profileId,
      });

      expect(parsed.suggestedAccountName).toBe("Informati");
      expect(parsed.jarunaCharacters[0]).toMatchObject({
        characterId: 123,
        name: "Hero & One",
        profession: "mage",
      });
    })
  );

  it.effect("does not mix unsupported-world records into Jaruna output", () =>
    Effect.gen(function* ignoreUnsupportedWorld() {
      const profileId = yield* parseMargonemProfileId(7_298_897);
      const parsed = yield* parseMargonemProfileHtml({
        html: `
          <div class="profile-header__name"><span>Informati</span></div>
          <li class="char-row" data-world="#unknown" data-id="456" data-nick="Other" data-lvl="150">
            <span class="character-prof">Mag</span>
          </li>
          <li class="char-row" data-world="#jaruna" data-id="123" data-nick="Hero" data-lvl="150">
            <span class="character-prof">Mag</span>
          </li>
        `,
        profileId,
      });

      expect(parsed.jarunaCharacters).toHaveLength(1);
      expect(parsed.jarunaCharacters[0]?.characterId).toBe(123);
    })
  );

  it.effect(
    "parses a valid Jaruna character row without running nested effects",
    () =>
      Effect.gen(function* parseJarunaCharacter() {
        const profileId = yield* parseMargonemProfileId(7_298_897);
        const parsed = yield* parseMargonemProfileHtml({
          html: `
          <div class="profile-header__name"><span>Informati</span></div>
          <li class="char-row" data-world="#jaruna" data-id="123" data-nick="Hero" data-lvl="150">
            <span class="cimg" style="background-image: url(&amp;quot;https://micc.garmory-cdn.cloud/obrazki/postacie/mage/20/m_mag081.gif&amp;quot;);"></span>
            <span class="character-prof">Mag</span>
          </li>
        `,
          profileId,
        });

        expect(parsed.suggestedAccountName).toBe("Informati");
        expect(parsed.jarunaCharacters).toHaveLength(1);
        expect(parsed.jarunaCharacters[0]?.avatarUrl).toBe(
          "https://micc.garmory-cdn.cloud/obrazki/postacie/mage/20/m_mag081.gif"
        );
        expect(parsed.jarunaCharacters[0]?.profession).toBe("mage");
      })
  );
});
