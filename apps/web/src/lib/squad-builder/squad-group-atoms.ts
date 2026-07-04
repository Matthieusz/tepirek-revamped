import { Effect } from "effect";

import { appHttpApiAtom, appHttpApiFn } from "@/lib/http-api-client-runtime";

interface SquadGroupIdInput {
  readonly actorUserId: string;
  readonly groupId: number;
}

export const squadGroupDetailAtom = (_payload: SquadGroupIdInput) =>
  appHttpApiAtom(Effect.succeed());

export const availableSquadCharactersAtom = (_payload: SquadGroupIdInput) =>
  appHttpApiAtom(Effect.succeed([]));

export const saveSquadGroupAtom = appHttpApiFn((_payload: unknown) =>
  Effect.fail(
    new Error(
      "Zapisywanie grup składów nie zostało jeszcze przeniesione na Effect HttpApi."
    )
  )
);

export const saveSharedSquadGroupCharactersAtom = appHttpApiFn(
  (_payload: unknown) =>
    Effect.fail(
      new Error(
        "Zapisywanie składów współdzielonych nie zostało jeszcze przeniesione na Effect HttpApi."
      )
    )
);

export const setSquadGroupVisibilityAtom = appHttpApiFn((_payload: unknown) =>
  Effect.fail(
    new Error(
      "Zmiana widoczności nie została jeszcze przeniesiona na Effect HttpApi."
    )
  )
);
