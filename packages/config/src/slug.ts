const POLISH_LETTER_REPLACEMENTS: Record<string, string> = {
  Ó: "o",
  ó: "o",
  Ą: "a",
  ą: "a",
  Ć: "c",
  ć: "c",
  Ę: "e",
  ę: "e",
  Ł: "l",
  ł: "l",
  Ń: "n",
  ń: "n",
  Ś: "s",
  ś: "s",
  Ź: "z",
  ź: "z",
  Ż: "z",
  ż: "z",
};

export const slugifySkillRangeName = (input: string) =>
  input
    .trim()
    .replaceAll(
      /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/gu,
      (letter) => POLISH_LETTER_REPLACEMENTS[letter] ?? ""
    )
    .toLowerCase()
    .replaceAll(/\s+/gu, "-")
    .replaceAll(/[^a-z0-9-]/gu, "")
    .replaceAll(/--+/gu, "-")
    .replaceAll(/^-+|-+$/gu, "");
