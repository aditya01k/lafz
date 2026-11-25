import editorial from "./editorial.json";
import headline from "./headline.json";
import marker from "./marker.json";
import typewriter from "./typewriter.json";

/**
 * Caption presets, one JSON file each. To add yours: copy a file, change the id, name, blurb,
 * credit and any style fields (see Style in src/lib/templates.ts; anything you leave out uses the
 * defaults there), then add it to this list. See CONTRIBUTING.md.
 */
export const PRESET_FILES = [typewriter, headline, editorial, marker];
