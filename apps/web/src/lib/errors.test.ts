import { AnnouncementPersistenceUnavailable } from "@tepirek-revamped/api/protocol/announcement/http-api-contract";
import { AuctionPersistenceUnavailable } from "@tepirek-revamped/api/protocol/auction/http-api-contract";
import {
  BetBadRequest,
  BetPersistenceUnavailable,
} from "@tepirek-revamped/api/protocol/bet/http-api-contract";
import { EventPersistenceUnavailable } from "@tepirek-revamped/api/protocol/event/http-api-contract";
import { HeroesPersistenceUnavailable } from "@tepirek-revamped/api/protocol/heroes/http-api-contract";
import { RankingPersistenceUnavailable } from "@tepirek-revamped/api/protocol/ranking/http-api-contract";
import {
  SkillsConflict,
  SkillsPersistenceUnavailable,
} from "@tepirek-revamped/api/protocol/skills/http-api-contract";
import {
  SquadBuilderConflict,
  SquadBuilderForbidden,
  SquadBuilderNotFound,
  SquadBuilderPersistenceUnavailable,
} from "@tepirek-revamped/api/protocol/squad-builder/errors";
import { TodoPersistenceUnavailable } from "@tepirek-revamped/api/protocol/todo/http-api-contract";
import {
  UserForbidden,
  UserPersistenceUnavailable,
} from "@tepirek-revamped/api/protocol/user/http-api-contract";
import {
  VaultNotFound,
  VaultPersistenceUnavailable,
} from "@tepirek-revamped/api/protocol/vault/http-api-contract";
import { describe, expect, it } from "vitest";

import {
  getApiErrorMessage,
  getErrorMessage,
  getSquadBuilderLineErrorMessage,
} from "./errors";

const fallback = "Wystąpił błąd. Spróbuj ponownie później.";

describe("getErrorMessage", () => {
  it("returns the message from ordinary Error objects", () => {
    expect(getErrorMessage(new Error("Nie udało się zapisać"))).toBe(
      "Nie udało się zapisać"
    );
  });

  it("maps typed authorization failures to safe UI copy", () => {
    expect(
      getErrorMessage(new UserForbidden({ message: "raw server copy" }))
    ).toBe("Nie masz uprawnień do wykonania tej akcji.");
  });

  it("maps typed API failures without inspecting arbitrary tags", () => {
    expect(
      getApiErrorMessage(new BetBadRequest({ message: "Nieprawidłowa nazwa" }))
    ).toBe("Nieprawidłowa nazwa");
    expect(
      getApiErrorMessage(new SkillsConflict({ message: "CONFLICT" }))
    ).toBe("Nie można zapisać zmian, bo zasób został już zmieniony.");
    expect(getApiErrorMessage(new VaultNotFound({ message: "missing" }))).toBe(
      "Nie znaleziono zasobu."
    );
    expect(
      getApiErrorMessage(new SquadBuilderForbidden({ message: "FORBIDDEN" }))
    ).toBe("Nie masz uprawnień do wykonania tej akcji.");
    expect(
      getApiErrorMessage(new SquadBuilderNotFound({ message: "missing" }))
    ).toBe("Nie znaleziono zasobu.");
    expect(
      getApiErrorMessage(new SquadBuilderConflict({ message: "CONFLICT" }))
    ).toBe("Nie można zapisać zmian, bo zasób został już zmieniony.");
  });

  it("maps every public persistence error to safe fallback copy", () => {
    const errors = [
      new AnnouncementPersistenceUnavailable({ operation: "list" }),
      new AuctionPersistenceUnavailable({ operation: "list" }),
      new BetPersistenceUnavailable({ operation: "list" }),
      new EventPersistenceUnavailable({ operation: "list" }),
      new HeroesPersistenceUnavailable({ operation: "list" }),
      new RankingPersistenceUnavailable({ operation: "list" }),
      new SkillsPersistenceUnavailable({ operation: "list" }),
      new TodoPersistenceUnavailable({ operation: "list" }),
      new UserPersistenceUnavailable({ operation: "list" }),
      new VaultPersistenceUnavailable({ operation: "list" }),
      new SquadBuilderPersistenceUnavailable({ operation: "list" }),
    ];

    for (const error of errors) {
      expect(getErrorMessage(error)).toBe(fallback);
    }
  });

  it("does not trust an arbitrary object with a tag-shaped property", () => {
    expect(
      getErrorMessage({ _tag: "UserForbidden", message: "raw server copy" })
    ).toBe(fallback);
  });

  it("maps typed squad-builder line failures", () => {
    expect(
      getSquadBuilderLineErrorMessage({
        _tag: "DuplicateProfileInBatch",
        firstLineNumber: 1,
      })
    ).toBe("Ten profil występuje na liście więcej niż raz.");
    expect(
      getSquadBuilderLineErrorMessage({
        _tag: "FirecrawlRequestFailed",
        profileId: 123,
      })
    ).toBe("Nie udało się pobrać profilu Margonem.");
  });

  it("uses the caller fallback for non-error unknown values", () => {
    expect(getErrorMessage("błąd", "Nie udało się sprawdzić kont")).toBe(
      "Nie udało się sprawdzić kont"
    );
  });

  it("does not expose unknown values", () => {
    for (const value of [null, undefined, "błąd", { message: "błąd" }]) {
      expect(getErrorMessage(value)).toBe(fallback);
    }
  });
});
