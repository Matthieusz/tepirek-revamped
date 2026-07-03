import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { makeApiLiveLayer } from "../effect-app.js";
import { TodoStore } from "../modules/todo/todo-store.js";
import { createVerifiedMember } from "../test/integration/builders.js";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}

const runStoreEffect = <A, E>(effect: Effect.Effect<A, E, TodoStore>) =>
  Effect.runPromise(effect.pipe(Effect.provide(makeApiLiveLayer(databaseUrl))));

describe("todo HttpApi store Postgres integration", () => {
  it("lets verified users create, list, toggle, and delete their own todos", async () => {
    const member = await createVerifiedMember({ id: "todo-member" });

    await runStoreEffect(
      TodoStore.use((store) =>
        store.create({ text: "Przygotować skład", userId: member.id })
      )
    );

    const [createdTodo] = await runStoreEffect(
      TodoStore.use((store) => store.list({ userId: member.id }))
    );
    expect(createdTodo).toMatchObject({
      completed: false,
      text: "Przygotować skład",
      userId: member.id,
    });

    await runStoreEffect(
      TodoStore.use((store) =>
        store.toggle({
          completed: true,
          id: createdTodo?.id ?? 0,
          userId: member.id,
        })
      )
    );
    await expect(
      runStoreEffect(
        TodoStore.use((store) => store.list({ userId: member.id }))
      )
    ).resolves.toEqual([
      expect.objectContaining({ completed: true, text: "Przygotować skład" }),
    ]);

    await runStoreEffect(
      TodoStore.use((store) =>
        store.delete({ id: createdTodo?.id ?? 0, userId: member.id })
      )
    );

    await expect(
      runStoreEffect(
        TodoStore.use((store) => store.list({ userId: member.id }))
      )
    ).resolves.toEqual([]);
  });

  it("isolates todos by authenticated user", async () => {
    const firstMember = await createVerifiedMember({ id: "todo-member-one" });
    const secondMember = await createVerifiedMember({ id: "todo-member-two" });

    await runStoreEffect(
      TodoStore.use((store) =>
        store.create({
          text: "Zadanie pierwszego gracza",
          userId: firstMember.id,
        })
      )
    );
    const [firstTodo] = await runStoreEffect(
      TodoStore.use((store) => store.list({ userId: firstMember.id }))
    );

    await runStoreEffect(
      TodoStore.use((store) =>
        store.toggle({
          completed: true,
          id: firstTodo?.id ?? 0,
          userId: secondMember.id,
        })
      )
    );
    await runStoreEffect(
      TodoStore.use((store) =>
        store.delete({ id: firstTodo?.id ?? 0, userId: secondMember.id })
      )
    );

    await expect(
      runStoreEffect(
        TodoStore.use((store) => store.list({ userId: secondMember.id }))
      )
    ).resolves.toEqual([]);
    await expect(
      runStoreEffect(
        TodoStore.use((store) => store.list({ userId: firstMember.id }))
      )
    ).resolves.toEqual([
      expect.objectContaining({
        completed: false,
        text: "Zadanie pierwszego gracza",
        userId: firstMember.id,
      }),
    ]);
  });
});
