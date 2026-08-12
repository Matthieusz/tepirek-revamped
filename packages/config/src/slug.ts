const POLISH_LETTER_REPLACEMENTS = {
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
} satisfies Record<string, string>;

const hasPolishLetterReplacement = (
  letter: string
): letter is keyof typeof POLISH_LETTER_REPLACEMENTS =>
  Object.hasOwn(POLISH_LETTER_REPLACEMENTS, letter);

export const slugifySkillRangeName = (input: string) =>
  input
    .trim()
    .replaceAll(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/gu, (letter) =>
      hasPolishLetterReplacement(letter)
        ? POLISH_LETTER_REPLACEMENTS[letter]
        : ""
    )
    .toLowerCase()
    .replaceAll(/\s+/gu, "-")
    .replaceAll(/[^a-z0-9-]/gu, "")
    .replaceAll(/--+/gu, "-")
    .replaceAll(/^-+|-+$/gu, "");
