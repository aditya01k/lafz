/**
 * Languages offered at upload. Each can be written two ways:
 *   latin:  in English letters, the way people type on WhatsApp ("kya scene hai")
 *   native: in the language's own script, with English words left in English ("क्या scene है")
 * Sarvam hears all of them; `sarvam` is its language code.
 */
export type Script = "latin" | "native";

export type Language = {
  id: string;
  name: string;
  /** The native script's name, for the "Write in" choice. */
  scriptName: string;
  sarvam: string;
  latinSample: string;
  nativeSample: string;
};

export const LANGUAGES: Language[] = [
  { id: "hindi", name: "Hindi", scriptName: "Hindi script", sarvam: "hi-IN", latinSample: "kya scene hai", nativeSample: "क्या सीन है" },
  { id: "tamil", name: "Tamil", scriptName: "Tamil script", sarvam: "ta-IN", latinSample: "enna scene da", nativeSample: "என்ன சீன் டா" },
  { id: "telugu", name: "Telugu", scriptName: "Telugu script", sarvam: "te-IN", latinSample: "em scene ra", nativeSample: "ఏం సీన్ రా" },
  { id: "kannada", name: "Kannada", scriptName: "Kannada script", sarvam: "kn-IN", latinSample: "en scene guru", nativeSample: "ಏನ್ ಸೀನ್ ಗುರು" },
  { id: "malayalam", name: "Malayalam", scriptName: "Malayalam script", sarvam: "ml-IN", latinSample: "enthu scene aa", nativeSample: "എന്ത് സീൻ ആ" },
  { id: "bengali", name: "Bengali", scriptName: "Bengali script", sarvam: "bn-IN", latinSample: "ki scene re", nativeSample: "কি সিন রে" },
  { id: "marathi", name: "Marathi", scriptName: "Marathi script", sarvam: "mr-IN", latinSample: "kay scene aahe", nativeSample: "काय सीन आहे" },
  { id: "gujarati", name: "Gujarati", scriptName: "Gujarati script", sarvam: "gu-IN", latinSample: "shu scene che", nativeSample: "શું સીન છે" },
  { id: "punjabi", name: "Punjabi", scriptName: "Gurmukhi", sarvam: "pa-IN", latinSample: "ki scene aa", nativeSample: "ਕੀ ਸੀਨ ਆ" },
  { id: "urdu", name: "Urdu", scriptName: "Urdu script", sarvam: "ur-IN", latinSample: "kya scene hai", nativeSample: "کیا سین ہے" },
  { id: "odia", name: "Odia", scriptName: "Odia script", sarvam: "od-IN", latinSample: "ki scene", nativeSample: "କି ସିନ୍" },
];

export const languageById = (id: string) => LANGUAGES.find((l) => l.id === id) ?? LANGUAGES[0];
