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
