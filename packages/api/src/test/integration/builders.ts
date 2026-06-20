import { user } from "@tepirek-revamped/db/schema/auth";

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
