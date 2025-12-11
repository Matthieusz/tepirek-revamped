/**
 * Shared types for squad builder functionality
 */

export type VerifiedUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

export type Character = {
  id: number;
  nick: string;
  level: number;
  profession: string;
  professionName: string;
  world: string;
  avatarUrl: string | null;
  guildName: string | null;
  gameAccountName: string;
};

export type CharacterWithAccountId = Character & {
  gameAccountId: number;
};

export type GameAccount = {
  id: number;
  name: string;
  profileUrl: string | null;
  accountLevel: number | null;
  userId: string;
  isOwner: boolean;
  canManage: boolean;
  ownerName: string | null;
};

export type GameAccountShare = {
  id: number;
  canManage: boolean;
  userId: string;
  userName: string;
  userEmail: string;
  userImage: string | null;
};

export type Squad = {
  id: number;
  name: string;
  description: string | null;
  world: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  isOwner: boolean;
  canEdit: boolean;
  ownerName: string | null;
};

export type SquadShare = {
  id: number;
  canEdit: boolean;
  odUserId: string;
  userName: string;
  userEmail: string;
  userImage: string | null;
};

export type SquadMember = {
  id: number;
  position: number;
  role: string | null;
  characterId: number;
  characterNick: string;
  characterLevel: number;
  characterProfession: string;
  characterProfessionName: string;
  characterWorld: string;
  characterAvatarUrl: string | null;
  characterGuildName: string | null;
  gameAccountName: string;
};

export type SquadDetails = {
  id: number;
  name: string;
  description: string | null;
  world: string;
  isPublic: boolean;
  isOwner: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  members: SquadMember[];
  shares: SquadShare[];
};
