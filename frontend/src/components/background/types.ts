/** Morph state machine phases */
export type MorphPhase = "normal" | "bolding" | "fading" | "unbolding";

/** Individual character in the animation */
export interface Character {
  /** Current character being displayed */
  char: string;
  /** X position in pixels */
  x: number;
  /** Y position in pixels */
  y: number;
  /** Character color (hex or rgba) */
  color: string;
  /** Current opacity (0-1) */
  opacity: number;
  /** Current font weight (400-700) */
  weight: number;
  /** Current morph phase */
  morphPhase: MorphPhase;
  /** Time when current morph phase started */
  morphStartTime: number;
  /** Script type for character replacement */
  scriptType: "greek" | "hebrew" | "aramaic";
}

/** Row of characters with scroll state */
export interface Row {
  /** Characters in this row */
  chars: Character[];
  /** Scroll direction: 1 = right, -1 = left */
  direction: 1 | -1;
  /** Current scroll offset in pixels */
  offset: number;
  /** Y position of this row */
  y: number;
}

/** Focus river edge state */
export interface RiverEdge {
  /** Base distance from center */
  baseWidth: number;
  /** Maximum variance from base */
  variance: number;
  /** Noise offset for left edge */
  leftNoiseOffset: number;
  /** Noise offset for right edge */
  rightNoiseOffset: number;
}

/** Animation configuration */
export interface AnimationConfig {
  /** Character width in pixels */
  charWidth: number;
  /** Character height in pixels */
  charHeight: number;
  /** Font size in pixels */
  fontSize: number;
  /** Scroll speed in pixels per second */
  scrollSpeed: number;
  /** Probability of morph per character per second */
  morphProbability: number;
  /** Duration of bolding phase in ms */
  boldingDuration: number;
  /** Duration of fading phase in ms */
  fadingDuration: number;
  /** Duration of unbolding phase in ms */
  unboldingDuration: number;
  /** Base character opacity */
  baseOpacity: number;
  /** Minimum opacity during fade */
  minFadeOpacity: number;
}

/** Color palette for characters */
export interface ColorPalette {
  /** Array of hex colors for characters */
  colors: string[];
}
