/**
 * Ancient script character sets for the animated background
 */

/** Greek alphabet characters */
export const GREEK_CHARS = [
  // Uppercase
  "Α", "Β", "Γ", "Δ", "Ε", "Ζ", "Η", "Θ", "Ι", "Κ", "Λ", "Μ",
  "Ν", "Ξ", "Ο", "Π", "Ρ", "Σ", "Τ", "Υ", "Φ", "Χ", "Ψ", "Ω",
  // Lowercase
  "α", "β", "γ", "δ", "ε", "ζ", "η", "θ", "ι", "κ", "λ", "μ",
  "ν", "ξ", "ο", "π", "ρ", "σ", "τ", "υ", "φ", "χ", "ψ", "ω",
];

/** Hebrew alphabet characters */
export const HEBREW_CHARS = [
  "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י", "כ", "ל",
  "מ", "נ", "ס", "ע", "פ", "צ", "ק", "ר", "ש", "ת",
  // Final forms
  "ך", "ם", "ן", "ף", "ץ",
];

/** Aramaic (Syriac) alphabet characters */
export const ARAMAIC_CHARS = [
  "ܐ", "ܒ", "ܓ", "ܕ", "ܗ", "ܘ", "ܙ", "ܚ", "ܛ", "ܝ", "ܟ", "ܠ",
  "ܡ", "ܢ", "ܣ", "ܥ", "ܦ", "ܨ", "ܩ", "ܪ", "ܫ", "ܬ",
];

/** All characters combined */
export const ALL_CHARS = [...GREEK_CHARS, ...HEBREW_CHARS, ...ARAMAIC_CHARS];

/** Character set lookup by type */
export const CHAR_SETS = {
  greek: GREEK_CHARS,
  hebrew: HEBREW_CHARS,
  aramaic: ARAMAIC_CHARS,
} as const;

export type ScriptType = keyof typeof CHAR_SETS;

/** Get a random character from a specific script */
export function getRandomChar(scriptType: ScriptType): string {
  const chars = CHAR_SETS[scriptType];
  return chars[Math.floor(Math.random() * chars.length)];
}

/** Get a random script type */
export function getRandomScriptType(): ScriptType {
  const types: ScriptType[] = ["greek", "hebrew", "aramaic"];
  return types[Math.floor(Math.random() * types.length)];
}

/** Get a random character from any script */
export function getRandomAnyChar(): { char: string; scriptType: ScriptType } {
  const scriptType = getRandomScriptType();
  return {
    char: getRandomChar(scriptType),
    scriptType,
  };
}
