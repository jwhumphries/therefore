import { useRef, useCallback, useEffect } from "react";
import {
  useAnimationLoop,
  useReducedMotion,
  useCanvasDimensions,
} from "./useAnimationLoop";
import { getRandomChar, getRandomScriptType } from "./characterSets";
import { getBlurZone, getRiverCenter, DEFAULT_RIVER_CONFIG, type RiverConfig } from "./focusRiver";
import type { Character, Row, AnimationConfig } from "./types";

interface AncientScriptBackgroundProps {
  className?: string;
}

// Animation configuration
const CONFIG: AnimationConfig = {
  charWidth: 28,
  charHeight: 36,
  fontSize: 22,
  scrollSpeed: 15, // pixels per second
  morphProbability: 0.15, // probability per character per second
  boldingDuration: 150,
  fadingDuration: 200,
  unboldingDuration: 150,
  baseOpacity: 0.35,
  minFadeOpacity: 0.1,
};

// Color palette - purples from gradient + gold from secondary
const CHARACTER_COLORS = [
  "rgba(109, 40, 217, 0.9)", // #6d28d9 - deep purple
  "rgba(168, 85, 247, 0.9)", // #a855f7 - medium purple
  "rgba(192, 132, 252, 0.85)", // #c084fc - light purple
  "rgba(180, 130, 80, 0.85)", // warm gold
  "rgba(160, 120, 90, 0.8)", // muted gold
];

// River configuration for focus effect
const RIVER_CONFIG: RiverConfig = {
  ...DEFAULT_RIVER_CONFIG,
  baseHalfWidth: 80, // Narrower river for more visible blur on edges
  variance: 40,
  yScale: 0.004,
  timeScale: 0.00015,
};

/**
 * Create a single character with random properties
 */
function createCharacter(x: number, y: number): Character {
  const scriptType = getRandomScriptType();
  return {
    char: getRandomChar(scriptType),
    x,
    y,
    color: CHARACTER_COLORS[Math.floor(Math.random() * CHARACTER_COLORS.length)],
    opacity: CONFIG.baseOpacity,
    weight: 400,
    morphPhase: "normal",
    morphStartTime: 0,
    scriptType,
  };
}

/**
 * Initialize rows of characters to fill the viewport
 */
function initializeRows(
  width: number,
  height: number,
  config: AnimationConfig
): Row[] {
  const rows: Row[] = [];
  const charsPerRow = Math.ceil(width / config.charWidth) + 4; // Extra for seamless scroll
  const rowCount = Math.ceil(height / config.charHeight) + 2;

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    const y = rowIndex * config.charHeight;
    const direction = rowIndex % 2 === 0 ? 1 : -1;
    const chars: Character[] = [];

    for (let i = 0; i < charsPerRow; i++) {
      chars.push(createCharacter(i * config.charWidth, y));
    }

    rows.push({
      chars,
      direction: direction as 1 | -1,
      offset: 0,
      y,
    });
  }

  return rows;
}

/**
 * Update character morph state machine
 */
function updateCharacterMorph(
  char: Character,
  time: number,
  deltaTime: number,
  config: AnimationConfig
): void {
  const elapsed = time - char.morphStartTime;

  switch (char.morphPhase) {
    case "normal": {
      // Random chance to start morphing
      const probability = config.morphProbability * (deltaTime / 1000);
      if (Math.random() < probability) {
        char.morphPhase = "bolding";
        char.morphStartTime = time;
      }
      break;
    }

    case "bolding": {
      const progress = Math.min(elapsed / config.boldingDuration, 1);
      char.weight = 400 + 300 * progress;
      char.opacity = CONFIG.baseOpacity;

      if (progress >= 1) {
        char.morphPhase = "fading";
        char.morphStartTime = time;
      }
      break;
    }

    case "fading": {
      const progress = Math.min(elapsed / config.fadingDuration, 1);
      // Opacity dips then recovers, weight stays at 700
      const fadeProgress = Math.sin(progress * Math.PI);
      char.opacity = CONFIG.baseOpacity - fadeProgress * (CONFIG.baseOpacity - config.minFadeOpacity);
      char.weight = 700;

      // Swap character at peak of fade
      if (progress >= 0.5 && elapsed - deltaTime < config.fadingDuration * 0.5) {
        char.char = getRandomChar(char.scriptType);
      }

      if (progress >= 1) {
        char.morphPhase = "unbolding";
        char.morphStartTime = time;
      }
      break;
    }

    case "unbolding": {
      const progress = Math.min(elapsed / config.unboldingDuration, 1);
      char.weight = 700 - 300 * progress;
      char.opacity = CONFIG.baseOpacity;

      if (progress >= 1) {
        char.morphPhase = "normal";
        char.weight = 400;
      }
      break;
    }
  }
}

/**
 * Update row scroll position and wrap characters
 */
function updateRowScroll(
  row: Row,
  deltaTime: number,
  config: AnimationConfig,
  viewportWidth: number
): void {
  const scrollAmount = (config.scrollSpeed * deltaTime) / 1000;
  row.offset += scrollAmount * row.direction;

  // Check each character and wrap if it goes off-screen
  for (const char of row.chars) {
    const renderX = char.x + row.offset;

    if (row.direction > 0) {
      // Scrolling right - characters move right, wrap from right to left
      if (renderX > viewportWidth + config.charWidth) {
        // Find leftmost position and place this char before it
        const minX = Math.min(...row.chars.map((c) => c.x));
        char.x = minX - config.charWidth;
        // Reset character with new random values
        const newChar = createCharacter(char.x, row.y);
        char.char = newChar.char;
        char.color = newChar.color;
        char.scriptType = newChar.scriptType;
        char.morphPhase = "normal";
        char.weight = 400;
        char.opacity = config.baseOpacity;
      }
    } else {
      // Scrolling left - characters move left, wrap from left to right
      if (renderX < -config.charWidth * 2) {
        // Find rightmost position and place this char after it
        const maxX = Math.max(...row.chars.map((c) => c.x));
        char.x = maxX + config.charWidth;
        // Reset character with new random values
        const newChar = createCharacter(char.x, row.y);
        char.char = newChar.char;
        char.color = newChar.color;
        char.scriptType = newChar.scriptType;
        char.morphPhase = "normal";
        char.weight = 400;
        char.opacity = config.baseOpacity;
      }
    }
  }
}

/**
 * Render a batch of characters with the same blur level
 */
function renderCharacterBatch(
  ctx: CanvasRenderingContext2D,
  chars: { char: Character; renderX: number; renderY: number }[],
  blur: number,
  dpr: number,
  fontSize: number,
  opacityMultiplier: number = 1
): void {
  if (chars.length === 0) return;

  ctx.save();

  if (blur > 0) {
    ctx.filter = `blur(${blur}px)`;
  }

  for (const { char, renderX, renderY } of chars) {
    ctx.globalAlpha = char.opacity * opacityMultiplier;
    ctx.font = `${char.weight} ${fontSize * dpr}px 'Lora Variable', Georgia, serif`;
    ctx.fillStyle = char.color;
    ctx.fillText(char.char, renderX, renderY);
  }

  ctx.restore();
}

export function AncientScriptBackground({ className = "" }: AncientScriptBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rowsRef = useRef<Row[]>([]);
  const vignetteCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const { width, height, dpr } = useCanvasDimensions(canvasRef);
  const lastDimensionsRef = useRef({ width: 0, height: 0, dpr: 1 });

  // Initialize rows only when dimensions actually change significantly
  useEffect(() => {
    const last = lastDimensionsRef.current;
    const widthChanged = Math.abs(width - last.width) > 10;
    const heightChanged = Math.abs(height - last.height) > 10;
    const dprChanged = dpr !== last.dpr;

    if (width > 0 && height > 0 && (widthChanged || heightChanged || dprChanged || rowsRef.current.length === 0)) {
      lastDimensionsRef.current = { width, height, dpr };
      rowsRef.current = initializeRows(width, height, CONFIG);

      // Create vignette overlay
      const vignetteCanvas = document.createElement("canvas");
      vignetteCanvas.width = width * dpr;
      vignetteCanvas.height = height * dpr;
      const vCtx = vignetteCanvas.getContext("2d");

      if (vCtx) {
        // Create radial gradient for vignette
        const centerX = (width * dpr) / 2;
        const centerY = (height * dpr) / 2;
        const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);

        const gradient = vCtx.createRadialGradient(
          centerX,
          centerY,
          maxRadius * 0.4,
          centerX,
          centerY,
          maxRadius
        );

        gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
        gradient.addColorStop(0.6, "rgba(0, 0, 0, 0.15)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0.4)");

        vCtx.fillStyle = gradient;
        vCtx.fillRect(0, 0, vignetteCanvas.width, vignetteCanvas.height);
      }

      vignetteCanvasRef.current = vignetteCanvas;
    }
  }, [width, height, dpr]);

  // Animation frame callback
  const onFrame = useCallback(
    ({ time, deltaTime }: { time: number; deltaTime: number }) => {
      const canvas = canvasRef.current;
      if (!canvas || rowsRef.current.length === 0) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const rows = rowsRef.current;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Calculate drifting river center (once per frame, not per character)
      const driftingCenter = getRiverCenter(time, width / 2, width);

      // Batch characters by blur zone
      const zone0: { char: Character; renderX: number; renderY: number }[] = [];
      const zone1: { char: Character; renderX: number; renderY: number }[] = [];
      const zone2: { char: Character; renderX: number; renderY: number }[] = [];

      for (const row of rows) {
        // Update scroll position (skip if reduced motion)
        if (!prefersReducedMotion) {
          updateRowScroll(row, deltaTime, CONFIG, width);
        }

        for (const char of row.chars) {
          // Update morph state (skip if reduced motion)
          if (!prefersReducedMotion) {
            updateCharacterMorph(char, time, deltaTime, CONFIG);
          }

          // Calculate render position
          const renderX = (char.x + row.offset) * dpr;
          const renderY = (char.y + CONFIG.charHeight * 0.8) * dpr;

          // Skip if off-screen
          if (renderX < -CONFIG.charWidth * dpr || renderX > canvas.width + CONFIG.charWidth * dpr) {
            continue;
          }

          // Determine blur zone (use unscaled coordinates for river calculation)
          const zone = getBlurZone(
            char.x + row.offset,
            char.y,
            time,
            driftingCenter,
            RIVER_CONFIG,
            width
          );

          const charData = { char, renderX, renderY };
          if (zone === 0) zone0.push(charData);
          else if (zone === 1) zone1.push(charData);
          else zone2.push(charData);
        }
      }

      // Render batches with appropriate blur
      ctx.textBaseline = "middle";

      // Heavy blur first (background) - also reduce opacity
      renderCharacterBatch(ctx, zone2, 4, dpr, CONFIG.fontSize, 0.5);

      // Light blur (transition) - slightly reduce opacity
      renderCharacterBatch(ctx, zone1, 2, dpr, CONFIG.fontSize, 0.75);

      // Sharp (river center) - full opacity
      renderCharacterBatch(ctx, zone0, 0, dpr, CONFIG.fontSize, 1.0);

      // Overlay vignette
      if (vignetteCanvasRef.current) {
        ctx.drawImage(vignetteCanvasRef.current, 0, 0);
      }
    },
    [width, dpr, prefersReducedMotion]
  );

  // Start animation loop
  useAnimationLoop({
    onFrame,
    pauseOnHidden: true,
  });

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
}
