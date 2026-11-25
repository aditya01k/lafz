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
  /** Stays in the same caption as the word before, whatever the automatic rules say. */
  keepWithPrev?: boolean;
  /** On a caption's last word: the caption's exact out point, set by trimming it. */
  outAt?: number;
};

export type TranscribeResult = {
  words: Word[];
  engine: "sarvam+whisper" | "whisper" | "local";
  durationSec: number;
  /** Credit left, in seconds (hosted only). */
  seconds?: number;
  /** Hosted: the video on the account, charged at its first export. */
  videoId?: string;
};
