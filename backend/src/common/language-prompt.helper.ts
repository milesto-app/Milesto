const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  fr: "French",
};

export function buildLanguageBlock(langCode: string): string {
  const languageName = LANGUAGE_NAMES[langCode] ?? "English";
  return `\n<language>
Generate ALL user-facing content in ${languageName}.
Keep JSON keys in English — only translate values (titles, descriptions, question texts, option labels).
</language>`;
}
