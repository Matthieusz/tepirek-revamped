import { describe, expect, it } from "vitest";

import { createVerifiedMember } from "../test/integration/builders";
import { createAuthenticatedRouterClient } from "../test/integration/router-client";

describe("todo router Postgres integration", () => {
  it("lets verified users create, list, toggle, and delete their own todos", async () => {
    const member = await createVerifiedMember({ id: "todo-member" });
    const client = createAuthenticatedRouterClient(member);

    await client.todo.create({ text: "Przygotować skład", userId: member.id });

    const [createdTodo] = await client.todo.getAll();
    expect(createdTodo).toMatchObject({
      completed: false,
      text: "Przygotować skład",
      userId: member.id,
    });

    await client.todo.toggle({ completed: true, id: createdTodo?.id ?? 0 });
    await expect(client.todo.getAll()).resolves.toEqual([
      expect.objectContaining({ completed: true, text: "Przygotować skład" }),
    ]);

    await client.todo.delete({ id: createdTodo?.id ?? 0 });

    await expect(client.todo.getAll()).resolves.toEqual([]);
  });

  it("isolates todos by authenticated user", async () => {
    const firstMember = await createVerifiedMember({ id: "todo-member-one" });
    const secondMember = await createVerifiedMember({ id: "todo-member-two" });
    const firstClient = createAuthenticatedRouterClient(firstMember);
    const secondClient = createAuthenticatedRouterClient(secondMember);

    await firstClient.todo.create({
      text: "Zadanie pierwszego gracza",
      userId: firstMember.id,
    });
    const [firstTodo] = await firstClient.todo.getAll();

    await secondClient.todo.toggle({ completed: true, id: firstTodo?.id ?? 0 });
    await secondClient.todo.delete({ id: firstTodo?.id ?? 0 });

    await expect(secondClient.todo.getAll()).resolves.toEqual([]);
    await expect(firstClient.todo.getAll()).resolves.toEqual([
      expect.objectContaining({
        completed: false,
        text: "Zadanie pierwszego gracza",
        userId: firstMember.id,
      }),
    ]);
  });

  it("uses the authenticated user as owner instead of the input userId", async () => {
    const firstMember = await createVerifiedMember({ id: "todo-owner" });
    const secondMember = await createVerifiedMember({ id: "todo-spoofed" });
    const firstClient = createAuthenticatedRouterClient(firstMember);
    const secondClient = createAuthenticatedRouterClient(secondMember);

    await firstClient.todo.create({
      text: "Nie można przypisać komuś innemu",
      userId: secondMember.id,
    });

    await expect(firstClient.todo.getAll()).resolves.toEqual([
      expect.objectContaining({
        text: "Nie można przypisać komuś innemu",
        userId: firstMember.id,
      }),
    ]);
    await expect(secondClient.todo.getAll()).resolves.toEqual([]);
  });
});
