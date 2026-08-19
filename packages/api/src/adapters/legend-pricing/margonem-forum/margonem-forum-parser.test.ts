import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import { describe } from "vitest";

import { parseMargonemForumTopic } from "./margonem-forum-parser.ts";

const HERO_URL =
  "https://forum.margonem.pl/?task=forum&show=posts&id=514740&ps=0";
const ELITE2_URL =
  "https://forum.margonem.pl/?task=forum&show=posts&id=514805&ps=0";

const item = (
  input: {
    readonly itemClass?: number;
    readonly name?: string;
    readonly path?: string;
    readonly stats?: string;
  } = {}
): string =>
  `<div class=itemborder><IMG src='https://micc.garmory-cdn.cloud/obrazki/itemy/${input.path ?? "pie/ring.gif"}' stats='${input.name ?? "Pierścień Strażnika"}||${input.stats ?? "binds;legbon=critred,23;lvl=23;rarity=legendary;reqp=bh"}||${input.itemClass ?? 12}||427178' ctip=item></div>`;

const enemy = (
  input: {
    readonly icon?: string;
    readonly items?: string;
    readonly level?: number;
    readonly name?: string;
    readonly profession?: string;
  } = {}
): string => `
  <center><blockquote><b>${input.name ?? "Domina Ecclesiae"}</b> - <i>${input.profession ?? "Tancerz Ostrzy"}, ${input.level ?? 21} lvl</i></blockquote></center>
  <BR><img src='//micc.garmory-cdn.cloud/obrazki/npc/${input.icon ?? "her/domina.gif"}'>
  <BR><b>Szablon zdobyczy:</b><BR>${input.items ?? item()}
`;

const officialPost = (postId: number, content: string): string => `
  <tr><td class="puser mod"><a name="post${postId}"></a>
    <div class="nickwood"><h3>Ekipa Garmory</h3></div>
    <a href="https://www.margonem.pl/profile/view,7798898"><img src="avatar.gif"></a>
    <img src='/img/forum-mg-new.png'>
  <td class=pcont>${content}
  <tr><td class="postid mod">2026.01.01<BR><i>Edytowany 14:59:56 1.7.2026 przez Vigellal</i>
`;

const userPost = (postId: number, content: string): string => `
  <tr><td class="puser"><a name="post${postId}"></a>
    <div class="nickwood"><h3>Zwykły gracz</h3></div>
    <a href="https://www.margonem.pl/profile/view,123"><img src="avatar.gif"></a>
  <td class=pcont>${content}
  <tr><td class="postid">2026.01.01
`;

const page = (
  category: "hero" | "elite2",
  posts: string
): Parameters<typeof parseMargonemForumTopic>[0] => ({
  category,
  html: `<html><body><table id=posts>${posts}</table></body></html>`,
  url: category === "hero" ? HERO_URL : ELITE2_URL,
});

const headingPost = (category: "hero" | "elite2"): string =>
  officialPost(
    100,
    `<blockquote>${category === "hero" ? "HEROSI" : "ELITY II"}</blockquote>`
  );

describe("Margonem forum topic parser", () => {
  it.effect(
    "parses only official staff guide posts and ignores replies and quotes",
    () =>
      Effect.gen(function* parseOfficialGuide() {
        const quotedEnemy = enemy({
          icon: "her/quoted.gif",
          name: "Cytowany Heros",
        });
        const replyItem = item({ path: "pie/reply.gif" });
        const snapshot = yield* parseMargonemForumTopic(
          page(
            "hero",
            [
              headingPost("hero"),
              officialPost(101, enemy()),
              userPost(
                102,
                `<blockquote>${quotedEnemy}</blockquote>${replyItem}`
              ),
            ].join("")
          )
        );

        expect(snapshot.enemies).toHaveLength(1);
        expect(snapshot.enemies[0]).toMatchObject({
          category: "hero",
          level: 21,
          name: "Domina Ecclesiae",
          profession: "bladeDancer",
          sourceIconKey: "/obrazki/npc/her/domina.gif",
          sourcePostId: 101,
          sourceUrl: HERO_URL,
        });
        expect(snapshot.items).toHaveLength(1);
        expect(snapshot.items[0]).toMatchObject({
          equipmentType: "ring",
          legendaryBonus: "critred,23",
          level: 23,
          name: "Pierścień Strażnika",
          professions: ["bladeDancer", "hunter"],
          sourceIconKey: "/obrazki/itemy/pie/ring.gif",
        });
        expect(snapshot.drops).toEqual([
          {
            enemyCategory: "hero",
            enemySourceIconKey: "/obrazki/npc/her/domina.gif",
            itemSourceIconKey: "/obrazki/itemy/pie/ring.gif",
          },
        ]);
        expect(snapshot.sourcePosts).toEqual([
          {
            category: "hero",
            editedAt: "14:59:56 1.7.2026",
            postId: 101,
          },
        ]);
      })
  );

  it.effect("accepts Firecrawl-normalized staff badge URLs", () =>
    Effect.gen(function* parseNormalizedBadgeUrl() {
      const normalizedPosts =
        `${headingPost("hero")}${officialPost(103, enemy())}`.replaceAll(
          "src='/img/forum-mg-new.png'",
          'src="https://forum.margonem.pl/img/forum-mg-new.png"'
        );

      const snapshot = yield* parseMargonemForumTopic(
        page("hero", normalizedPosts)
      );

      expect(snapshot.enemies).toHaveLength(1);
      expect(snapshot.sourcePosts).toHaveLength(1);
    })
  );

  it.effect("accepts Firecrawl tooltip attributes containing HTML", () =>
    Effect.gen(function* parseQuotedHtmlAttribute() {
      const items = [item({ stats: "lvl=23;rarity=common" }), item()]
        .join("")
        .replaceAll(
          "ctip=item>",
          'ctip="item" tip="<div class=&quot;item-head&quot;><b>Tooltip</b></div>">'
        );

      const snapshot = yield* parseMargonemForumTopic(
        page(
          "hero",
          `${headingPost("hero")}${officialPost(104, enemy({ items }))}`
        )
      );

      expect(snapshot.items).toHaveLength(1);
      expect(snapshot.items[0]?.name).toBe("Pierścień Strażnika");
    })
  );

  it.effect(
    "splits two Elite II enemies in one post and shares item identity",
    () =>
      Effect.gen(function* parseTwoEnemies() {
        const sharedItem = item({ itemClass: 13, path: "nas/shared.gif" });
        const content = [
          `<blockquote>ELITY II</blockquote>`,
          enemy({
            icon: "e2/first.gif",
            items: sharedItem,
            level: 30,
            name: "Shae Phu",
            profession: "Mag",
          }),
          enemy({
            icon: "e1/second.gif",
            items: sharedItem,
            level: 31,
            name: "Kotołak Tropiciel",
            profession: "Tropiciel",
          }),
        ].join("");
        const snapshot = yield* parseMargonemForumTopic(
          page("elite2", officialPost(201, content))
        );

        expect(snapshot.enemies.map(({ name }) => name)).toEqual([
          "Shae Phu",
          "Kotołak Tropiciel",
        ]);
        expect(snapshot.items).toHaveLength(1);
        expect(snapshot.drops).toHaveLength(2);
      })
  );

  it.effect("decodes apostrophes and accepts equipment without legbon", () =>
    Effect.gen(function* decodeItemMetadata() {
      const armor = item({
        itemClass: 8,
        name: "Kaftan Al&#39;diphrina",
        path: "zbr/armor.gif",
        stats: "binds;lvl=300;rarity=legendary;reqp=w",
      });
      const snapshot = yield* parseMargonemForumTopic(
        page(
          "hero",
          `${headingPost("hero")}${officialPost(301, enemy({ items: armor }))}`
        )
      );

      expect(snapshot.items[0]).toMatchObject({
        equipmentType: "armor",
        legendaryBonus: null,
        name: "Kaftan Al'diphrina",
        professions: ["warrior"],
      });
    })
  );

  it.effect("stops at box and outfit sections outside the loot template", () =>
    Effect.gen(function* ignoreLaterSections() {
      const laterItems = [
        item(),
        "<BR><BR><b>Przedmioty do zdobycia ze skrzyni:</b><BR>",
        item({ path: "pie/from-box.gif" }),
        item({
          itemClass: 30,
          path: "out/outfit.gif",
          stats: "outfit_selector=x;rarity=legendary",
        }),
      ].join("");
      const snapshot = yield* parseMargonemForumTopic(
        page(
          "hero",
          `${headingPost("hero")}${officialPost(401, enemy({ items: laterItems }))}`
        )
      );

      expect(snapshot.items.map(({ sourceIconKey }) => sourceIconKey)).toEqual([
        "/obrazki/itemy/pie/ring.gif",
      ]);
    })
  );

  it.effect(
    "excludes runes, containers, quest items, and unknown classes",
    () =>
      Effect.gen(function* excludeUnsupportedItems() {
        const candidates = [
          item({
            itemClass: 16,
            path: "sur/rune.gif",
            stats: "rarity=legendary;runes=2250",
          }),
          item({
            itemClass: 16,
            path: "bag/box.gif",
            stats: "lootbox2=12;rarity=legendary",
          }),
          item({
            itemClass: 15,
            path: "que/quest.gif",
            stats: "lvl=20;quest=1;rarity=legendary",
          }),
          item({ itemClass: 99, path: "neu/unknown.gif" }),
          item(),
        ].join("");
        const snapshot = yield* parseMargonemForumTopic(
          page(
            "hero",
            `${headingPost("hero")}${officialPost(501, enemy({ items: candidates }))}`
          )
        );

        expect(snapshot.items).toHaveLength(1);
        expect(snapshot.items[0]?.equipmentType).toBe("ring");
      })
  );

  it.effect("rejects malformed stats without publishing a partial block", () =>
    Effect.gen(function* rejectMalformedStats() {
      const malformed = `<div class=itemborder><IMG src='https://micc.garmory-cdn.cloud/obrazki/itemy/pie/bad.gif' stats='broken' ctip=item></div>`;
      const error = yield* parseMargonemForumTopic(
        page(
          "hero",
          `${headingPost("hero")}${officialPost(601, enemy({ items: `${item()}${malformed}` }))}`
        )
      ).pipe(Effect.flip);

      expect(error).toMatchObject({
        _tag: "MargonemForumGuideNotParseable",
        category: "hero",
        postId: 601,
        reason: "item stats must contain four parts",
      });
    })
  );

  it.effect("rejects legendary equipment with a missing level", () =>
    Effect.gen(function* rejectMissingLevel() {
      const missingLevel = item({ stats: "rarity=legendary;legbon=curse,20" });
      const error = yield* parseMargonemForumTopic(
        page(
          "hero",
          `${headingPost("hero")}${officialPost(701, enemy({ items: missingLevel }))}`
        )
      ).pipe(Effect.flip);

      expect(error.reason).toBe("legendary equipment has no valid level");
    })
  );

  it.effect("rejects a changed official author identity", () =>
    Effect.gen(function* rejectChangedAuthor() {
      const changedAuthor = officialPost(801, enemy()).replace(
        "profile/view,7798898",
        "profile/view,9999999"
      );
      const error = yield* parseMargonemForumTopic(
        page("hero", `${headingPost("hero")}${changedAuthor}`)
      ).pipe(Effect.flip);

      expect(error.reason).toBe("no complete official enemy entries found");
    })
  );
});
