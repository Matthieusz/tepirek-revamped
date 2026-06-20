import { user } from "@tepirek-revamped/db/schema/auth";
import { hero } from "@tepirek-revamped/db/schema/bet";
import { event } from "@tepirek-revamped/db/schema/event";
import { professions, range } from "@tepirek-revamped/db/schema/skills";

import { testDb } from "./database";

interface TestUserOverrides {
  email?: string;
  id?: string;
  image?: string | null;
  name?: string;
}

interface CreateTestUserOptions extends TestUserOverrides {
  role?: "admin" | "user";
  verified?: boolean;
}

export interface TestUser {
  email: string;
  id: string;
  image: string | null;
  name: string;
  role: "admin" | "user";
  verified: boolean;
}

let userSequence = 0;

const nextUserId = () => {
  userSequence += 1;
  return `test-user-${userSequence}`;
};

export const createTestUser = async ({
  email,
  id = nextUserId(),
  image = null,
  name = "Test User",
  role = "user",
  verified = false,
}: CreateTestUserOptions = {}): Promise<TestUser> => {
  const now = new Date();
  const testUser = {
    email: email ?? `${id}@example.com`,
    id,
    image,
    name,
    role,
    verified,
  } satisfies TestUser;

  await testDb.insert(user).values({
    createdAt: now,
    email: testUser.email,
    emailVerified: true,
    id: testUser.id,
    image: testUser.image,
    name: testUser.name,
    role: testUser.role,
    updatedAt: now,
    verified: testUser.verified,
  });

  return testUser;
};

export const createUnverifiedUser = (overrides: TestUserOverrides = {}) =>
  createTestUser({ ...overrides, role: "user", verified: false });

export const createVerifiedMember = (overrides: TestUserOverrides = {}) =>
  createTestUser({ ...overrides, role: "user", verified: true });

export const createAdmin = (overrides: TestUserOverrides = {}) =>
  createTestUser({ ...overrides, role: "admin", verified: true });

interface TestEventOverrides {
  color?: string;
  endTime?: Date;
  icon?: string;
  name?: string;
}

interface TestHeroOverrides {
  eventId?: number;
  image?: string | null;
  level?: number;
  name?: string;
}

export const createEvent = async ({
  color = "#22c55e",
  endTime = new Date("2030-01-02T03:04:05.000Z"),
  icon = "calendar",
  name = "Test Event",
}: TestEventOverrides = {}) => {
  const [createdEvent] = await testDb
    .insert(event)
    .values({ color, endTime, icon, name })
    .returning();

  if (!createdEvent) {
    throw new Error("Failed to create test event");
  }

  return createdEvent;
};

export const createHero = async ({
  eventId,
  image = null,
  level = 100,
  name = "Test Hero",
}: TestHeroOverrides = {}) => {
  let resolvedEventId = eventId;

  if (resolvedEventId === undefined) {
    const createdEvent = await createEvent();
    resolvedEventId = createdEvent.id;
  }

  const [createdHero] = await testDb
    .insert(hero)
    .values({ eventId: resolvedEventId, image, level, name })
    .returning();

  if (!createdHero) {
    throw new Error("Failed to create test hero");
  }

  return createdHero;
};

interface TestProfessionOverrides {
  name?: string;
}

interface TestRangeOverrides {
  image?: string;
  level?: number;
  name?: string;
}

export const createProfession = async ({
  name = "Test Profession",
}: TestProfessionOverrides = {}) => {
  const [createdProfession] = await testDb
    .insert(professions)
    .values({ name })
    .returning();

  if (!createdProfession) {
    throw new Error("Failed to create test profession");
  }

  return createdProfession;
};

export const createRange = async ({
  image = "https://example.com/range.png",
  level = 100,
  name = "Test Range",
}: TestRangeOverrides = {}) => {
  const [createdRange] = await testDb
    .insert(range)
    .values({ image, level, name })
    .returning();

  if (!createdRange) {
    throw new Error("Failed to create test range");
  }

  return createdRange;
};
