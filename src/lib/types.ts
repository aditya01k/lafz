/** One spoken word with its timing, in seconds from the start of the video. */
export type Word = {
  id: string;
  text: string;
  start: number;
  end: number;
  /** Shown in the template's highlight colour. */
  emphasis?: boolean;
  /** Starts a new caption line at this word (the user's own break). */
  breakBefore?: boolean;
  /** Emoji suggested for this word; shown when emojis are on. */
  emoji?: string;
};

export type TranscribeResult = {
  words: Word[];
  engine: "sarvam+whisper" | "whisper";
  durationSec: number;
};
