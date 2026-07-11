import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";

import { AnnouncementPersistenceUnavailable } from "./announcement/http-api-contract.js";
import { AuctionPersistenceUnavailable } from "./auction/http-api-contract.js";
import { BetPersistenceUnavailable } from "./bet/http-api-contract.js";
import { EventPersistenceUnavailable } from "./event/http-api-contract.js";
import { HeroesPersistenceUnavailable } from "./heroes/http-api-contract.js";
import { RankingPersistenceUnavailable } from "./ranking/http-api-contract.js";
import { SkillsPersistenceUnavailable } from "./skills/http-api-contract.js";
import { SquadBuilderPersistenceUnavailable } from "./squad-builder/errors.js";
import { TodoPersistenceUnavailable } from "./todo/http-api-contract.js";
import { UserPersistenceUnavailable } from "./user/http-api-contract.js";
import { VaultPersistenceUnavailable } from "./vault/http-api-contract.js";

const sensitiveFragments = [
  "postgres://admin:secret@database.internal/app",
  "https://provider.example/profile?token=secret",
  "relation users does not exist",
  "DatabaseError",
  "at query (/srv/app/database.ts:10:2)",
];

const assertSafeEncoding = <A, I>(schema: Schema.Codec<A, I>, value: A) => {
  const encoded = Schema.encodeUnknownSync(schema)(value);
  const responseBody = JSON.stringify(encoded);

  for (const fragment of sensitiveFragments) {
    expect(responseBody).not.toContain(fragment);
  }
  expect(responseBody).not.toContain("cause");
  expect(responseBody).not.toContain("stack");
};

describe("public persistence errors", () => {
  it("encode only stable public fields", () => {
    assertSafeEncoding(
      AnnouncementPersistenceUnavailable,
      new AnnouncementPersistenceUnavailable({ operation: "listAnnouncements" })
    );
    assertSafeEncoding(
      AuctionPersistenceUnavailable,
      new AuctionPersistenceUnavailable({ operation: "getAuctionSignups" })
    );
    assertSafeEncoding(
      BetPersistenceUnavailable,
      new BetPersistenceUnavailable({ operation: "getAllBets" })
    );
    assertSafeEncoding(
      EventPersistenceUnavailable,
      new EventPersistenceUnavailable({ operation: "listEvents" })
    );
    assertSafeEncoding(
      HeroesPersistenceUnavailable,
      new HeroesPersistenceUnavailable({ operation: "listHeroes" })
    );
    assertSafeEncoding(
      RankingPersistenceUnavailable,
      new RankingPersistenceUnavailable({ operation: "getRanking" })
    );
    assertSafeEncoding(
      SkillsPersistenceUnavailable,
      new SkillsPersistenceUnavailable({ operation: "listRanges" })
    );
    assertSafeEncoding(
      SquadBuilderPersistenceUnavailable,
      new SquadBuilderPersistenceUnavailable({ operation: "listOwnedAccounts" })
    );
    assertSafeEncoding(
      TodoPersistenceUnavailable,
      new TodoPersistenceUnavailable({ operation: "listTodos" })
    );
    assertSafeEncoding(
      UserPersistenceUnavailable,
      new UserPersistenceUnavailable({ operation: "listUsers" })
    );
    assertSafeEncoding(
      VaultPersistenceUnavailable,
      new VaultPersistenceUnavailable({ operation: "getVault" })
    );
  });
});
