// Parser HTML dla profili z margonem.pl
// Wyciąga dane postaci z elementów <li> w HTML profilu

const AVATAR_URL_REGEX = /url\(["']?([^"')]+)["']?\)/;

export interface ParsedCharacter {
  externalId: number;
  nick: string;
  level: number;
  profession: string;
  professionName: string;
  world: string;
  gender?: string;
  guildName?: string;
  guildId?: number;
  avatarUrl?: string;
}

export interface ParsedAccount {
  name: string;
  profileUrl?: string;
  accountLevel?: number;
  characters: ParsedCharacter[];
}

export const parseMargonemProfile = (html: string): ParsedAccount => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const profileNameEl = doc.querySelector(".profile-header__name span");
  const accountName = profileNameEl?.textContent?.trim() ?? "Nieznane konto";

  const accountLevel = extractAccountLevel(doc);
  const profileUrl = extractProfileUrl(doc);
  const characters = extractCharacters(doc);

  return {
    accountLevel,
    characters,
    name: accountName,
    profileUrl,
  };
};

const extractAccountLevel = (doc: Document): number | undefined => {
  const headerDataElements = doc.querySelectorAll(".profile-header-data");
  for (const el of headerDataElements) {
    const label = el.querySelector(".label")?.textContent?.trim();
    if (label === "Poziom konta:") {
      const value = el.querySelector(".value")?.textContent?.trim();
      if (value !== undefined && value !== "") {
        return Number.parseInt(value.replaceAll(/\s/g, ""), 10);
      }
    }
  }
  return undefined;
};

const extractProfileUrl = (doc: Document): string | undefined => {
  const copyButton = doc.querySelector<HTMLElement>(".js-url-copy");
  return copyButton?.dataset.url ?? undefined;
};

const extractCharacters = (doc: Document): ParsedCharacter[] => {
  const characters: ParsedCharacter[] = [];
  const characterElements = doc.querySelectorAll("li.char-row");

  for (const li of characterElements) {
    const char = extractSingleCharacter(li);
    if (char) {
      characters.push(char);
    }
  }

  return characters;
};

/* oxlint-disable complexity */
const extractSingleCharacter = (li: Element): ParsedCharacter | null => {
  // oxlint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  const htmlLi = li as HTMLElement;
  const externalIdStr = htmlLi.dataset.id;
  const { nick } = htmlLi.dataset;
  const levelStr = htmlLi.dataset.lvl;
  const worldRaw = htmlLi.dataset.world;

  if (
    externalIdStr === undefined ||
    externalIdStr === "" ||
    nick === undefined ||
    nick === "" ||
    levelStr === undefined ||
    levelStr === "" ||
    worldRaw === undefined ||
    worldRaw === ""
  ) {
    return null;
  }

  const professionCode =
    li.querySelector<HTMLInputElement>(".chprof")?.value ?? "";
  const professionName =
    li.querySelector<HTMLInputElement>(".chprofname")?.value ?? "";
  const gender = li.querySelector<HTMLInputElement>(".chgender")?.value;
  const guildName =
    li.querySelector<HTMLInputElement>(".chguild")?.value ?? undefined;
  const guildIdStr = li.querySelector<HTMLInputElement>(".chguildid")?.value;
  const guildId =
    guildIdStr !== undefined && guildIdStr !== ""
      ? Number.parseInt(guildIdStr, 10)
      : undefined;

  const avatarUrl = extractAvatarUrl(li);
  const world = worldRaw.replace("#", "");

  return {
    avatarUrl,
    externalId: Number.parseInt(externalIdStr, 10),
    gender,
    guildId: guildId !== undefined && guildId > 0 ? guildId : undefined,
    guildName:
      guildName !== undefined && guildName !== "" ? guildName : undefined,
    level: Number.parseInt(levelStr, 10),
    nick,
    profession: professionCode,
    professionName,
    world,
  };
};
/* oxlint-enable complexity */

const extractAvatarUrl = (li: Element): string | undefined => {
  const avatarSpan = li.querySelector(".cimg");
  if (!avatarSpan) {
    return;
  }

  const style = avatarSpan.getAttribute("style") ?? "";
  const urlMatch = style.match(AVATAR_URL_REGEX);
  return urlMatch?.[1];
};

export const professionColors: Record<string, string> = {
  // Tancerz ostrzy
  b: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
  // Łowca
  h: "bg-green-500/20 text-green-700 dark:text-green-400",
  // Mag
  m: "bg-purple-500/20 text-purple-700 dark:text-purple-400",
  // Paladyn
  p: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
  // Tropiciel
  t: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
  // Wojownik
  w: "bg-red-500/20 text-red-700 dark:text-red-400",
};

export const professionNames: Record<string, string> = {
  b: "Tancerz ostrzy",
  h: "Łowca",
  m: "Mag",
  p: "Paladyn",
  t: "Tropiciel",
  w: "Wojownik",
};

export const getProfessionColor = (code: string): string =>
  professionColors[code] ?? "bg-gray-500/20 text-gray-700 dark:text-gray-400";
