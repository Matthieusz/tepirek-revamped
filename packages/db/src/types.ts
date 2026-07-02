import type { InferSelectModel } from "drizzle-orm";

import type { announcement } from "./schema/announcement.js";
import type { auction } from "./schema/auction.js";
import type { user, session, account, verification } from "./schema/auth.js";
import type { hero, heroBet, heroBetMember, userStats } from "./schema/bet.js";
import type { event } from "./schema/event.js";
import type { range, skills, professions } from "./schema/skills.js";
import type { todo } from "./schema/todo.js";

export type User = InferSelectModel<typeof user>;
export type Session = InferSelectModel<typeof session>;
export type Account = InferSelectModel<typeof account>;
export type Verification = InferSelectModel<typeof verification>;
export type AuctionSignup = InferSelectModel<typeof auction>;
export type Announcement = InferSelectModel<typeof announcement>;
export type Hero = InferSelectModel<typeof hero>;
export type HeroBet = InferSelectModel<typeof heroBet>;
export type HeroBetMember = InferSelectModel<typeof heroBetMember>;
export type UserStats = InferSelectModel<typeof userStats>;
export type Event = InferSelectModel<typeof event>;
export type Range = InferSelectModel<typeof range>;
export type Skill = InferSelectModel<typeof skills>;
export type Profession = InferSelectModel<typeof professions>;
export type Todo = InferSelectModel<typeof todo>;
