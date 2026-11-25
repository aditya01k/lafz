/**
 * Languages offered at upload. Sarvam does the recognition for all of them;
 * "script" decides whether we ask for Roman (translit) or native + English (codemix).
 */
export type Language = {
  id: string;
  name: string;
  /** What creators call the Roman-script mix, shown under the name. */
  sub: string;
  sarvam: string;
  script: "roman" | "native";
  status: "live" | "beta";
};

export const LANGUAGES: Language[] = [
  { id: "hinglish", name: "Hinglish", sub: "Hindi + English, Roman", sarvam: "hi-IN", script: "roman", status: "live" },
  { id: "hindi", name: "Hindi", sub: "देवनागरी + English", sarvam: "hi-IN", script: "native", status: "beta" },
  { id: "tanglish", name: "Tanglish", sub: "Tamil, Roman", sarvam: "ta-IN", script: "roman", status: "beta" },
  { id: "punjabi", name: "Punjabi", sub: "Roman", sarvam: "pa-IN", script: "roman", status: "beta" },
  { id: "bengali", name: "Bengali", sub: "Roman", sarvam: "bn-IN", script: "roman", status: "beta" },
  { id: "marathi", name: "Marathi", sub: "Roman", sarvam: "mr-IN", script: "roman", status: "beta" },
  { id: "gujarati", name: "Gujarati", sub: "Roman", sarvam: "gu-IN", script: "roman", status: "beta" },
  { id: "telugu", name: "Telugu", sub: "Roman", sarvam: "te-IN", script: "roman", status: "beta" },
  { id: "kannada", name: "Kannada", sub: "Roman", sarvam: "kn-IN", script: "roman", status: "beta" },
  { id: "malayalam", name: "Malayalam", sub: "Manglish, Roman", sarvam: "ml-IN", script: "roman", status: "beta" },
  { id: "urdu", name: "Urdu", sub: "Roman", sarvam: "ur-IN", script: "roman", status: "beta" },
  { id: "odia", name: "Odia", sub: "Roman", sarvam: "od-IN", script: "roman", status: "beta" },
];

export const languageById = (id: string) => LANGUAGES.find((l) => l.id === id) ?? LANGUAGES[0];

/** The language name the spelling pass is told about. */
export const spokenName = (l: Language) => (l.id === "hinglish" || l.id === "hindi" ? "Hindi" : l.name.replace("Tanglish", "Tamil"));
