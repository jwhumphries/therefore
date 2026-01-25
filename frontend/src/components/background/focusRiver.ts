/**
 * Focus River - Creates an organic, breathing focus area in the center of the screen
 * Uses simplex noise for smooth, natural edge animation
 */

/**
 * Simple 2D noise implementation (permutation-based)
 * Produces smooth, repeatable noise values between -1 and 1
 */
class SimplexNoise {
  private perm: Uint8Array;
  private perm12: Uint8Array;

  constructor(seed = Math.random() * 65536) {
    this.perm = new Uint8Array(512);
    this.perm12 = new Uint8Array(512);

    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      p[i] = i;
    }

    // Fisher-Yates shuffle with seed
    let n = seed;
    for (let i = 255; i > 0; i--) {
      n = ((n * 16807) % 2147483647 + 2147483647) % 2147483647;
      const j = n % (i + 1);
      [p[i], p[j]] = [p[j], p[i]];
    }

    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
      this.perm12[i] = this.perm[i] % 12;
    }
  }

  private grad3 = [
    [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
    [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
    [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
  ];

  private dot2(g: number[], x: number, y: number): number {
    return g[0] * x + g[1] * y;
  }

  noise2D(x: number, y: number): number {
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;

    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const t = (i + j) * G2;

    const X0 = i - t;
    const Y0 = j - t;
    const x0 = x - X0;
    const y0 = y - Y0;

    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;

    const ii = i & 255;
    const jj = j & 255;

    let n0 = 0, n1 = 0, n2 = 0;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      t0 *= t0;
      const gi0 = this.perm12[ii + this.perm[jj]];
      n0 = t0 * t0 * this.dot2(this.grad3[gi0], x0, y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      t1 *= t1;
      const gi1 = this.perm12[ii + i1 + this.perm[jj + j1]];
      n1 = t1 * t1 * this.dot2(this.grad3[gi1], x1, y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      t2 *= t2;
      const gi2 = this.perm12[ii + 1 + this.perm[jj + 1]];
      n2 = t2 * t2 * this.dot2(this.grad3[gi2], x2, y2);
    }

    // Scale to [-1, 1]
    return 70 * (n0 + n1 + n2);
  }
}

// Singleton noise instance
let noiseInstance: SimplexNoise | null = null;

function getNoise(): SimplexNoise {
  if (!noiseInstance) {
    noiseInstance = new SimplexNoise(12345); // Fixed seed for consistency
  }
  return noiseInstance;
}

/**
 * Configuration for the focus river
 */
export interface RiverConfig {
  /** Base half-width of the river in pixels */
  baseHalfWidth: number;
  /** Maximum variance for edge breathing */
  variance: number;
  /** Noise scale for Y axis (lower = smoother) */
  yScale: number;
  /** Noise scale for time (lower = slower animation) */
  timeScale: number;
  /** Offset between left and right edge noise */
  edgeOffset: number;
}

export const DEFAULT_RIVER_CONFIG: RiverConfig = {
  baseHalfWidth: 120,
  variance: 60,
  yScale: 0.003,
  timeScale: 0.0002,
  edgeOffset: 1000,
};

/**
 * Calculate a drifting river center that moves organically across the screen
 */
export function getRiverCenter(
  time: number,
  baseCenter: number,
  viewportWidth: number
): number {
  const noise = getNoise();

  // Slow horizontal drift - use different noise coordinates than edges
  const driftNoise = noise.noise2D(time * 0.00008, 500);

  // Allow river to drift across 60% of screen width (20% to 80%)
  const driftRange = viewportWidth * 0.3;
  const driftedCenter = baseCenter + driftNoise * driftRange;

  return driftedCenter;
}

/**
 * Calculate the left and right edges of the focus river at a given Y position
 */
export function getRiverEdges(
  y: number,
  time: number,
  centerX: number,
  config: RiverConfig = DEFAULT_RIVER_CONFIG,
  viewportWidth: number = 0
): { left: number; right: number } {
  const noise = getNoise();

  // Add a wave/curve effect - the river snakes as it goes down the screen
  const waveAmplitude = viewportWidth > 0 ? viewportWidth * 0.08 : 50;
  const waveNoise = noise.noise2D(y * 0.002, time * 0.0001);
  const waveCurve = waveNoise * waveAmplitude;

  const curvedCenter = centerX + waveCurve;

  // Left edge noise - scales between 0 and 1
  const leftNoise = (noise.noise2D(y * config.yScale, time * config.timeScale) + 1) / 2;
  const leftEdge = curvedCenter - config.baseHalfWidth - leftNoise * config.variance;

  // Right edge noise - offset to animate independently
  const rightNoise =
    (noise.noise2D((y + config.edgeOffset) * config.yScale, time * config.timeScale) + 1) / 2;
  const rightEdge = curvedCenter + config.baseHalfWidth + rightNoise * config.variance;

  return { left: leftEdge, right: rightEdge };
}

/**
 * Determine the blur zone for a character based on its position
 * Returns 0 (sharp), 1 (light blur), or 2 (heavy blur)
 */
export function getBlurZone(
  x: number,
  y: number,
  time: number,
  centerX: number,
  config: RiverConfig = DEFAULT_RIVER_CONFIG,
  viewportWidth: number = 0
): 0 | 1 | 2 {
  const { left, right } = getRiverEdges(y, time, centerX, config, viewportWidth);
  const transitionWidth = 40; // Pixels for blur transition zone

  // In the sharp river center
  if (x >= left && x <= right) {
    return 0;
  }

  // In the transition zone (light blur)
  if (x >= left - transitionWidth && x <= right + transitionWidth) {
    return 1;
  }

  // Outside - heavy blur
  return 2;
}

/**
 * Get blur amount for smooth transition (for per-character blur if needed)
 * Returns a value between 0 and maxBlur
 */
export function getBlurAmount(
  x: number,
  y: number,
  time: number,
  centerX: number,
  maxBlur: number = 3,
  config: RiverConfig = DEFAULT_RIVER_CONFIG
): number {
  const { left, right } = getRiverEdges(y, time, centerX, config);
  const transitionWidth = 60;
  const outerTransition = 80;

  // In the sharp river center
  if (x >= left && x <= right) {
    return 0;
  }

  // Transitioning out on the left
  if (x < left) {
    const distance = left - x;
    if (distance < transitionWidth) {
      return (distance / transitionWidth) * (maxBlur * 0.5);
    }
    if (distance < transitionWidth + outerTransition) {
      const t = (distance - transitionWidth) / outerTransition;
      return maxBlur * 0.5 + t * maxBlur * 0.5;
    }
    return maxBlur;
  }

  // Transitioning out on the right
  const distance = x - right;
  if (distance < transitionWidth) {
    return (distance / transitionWidth) * (maxBlur * 0.5);
  }
  if (distance < transitionWidth + outerTransition) {
    const t = (distance - transitionWidth) / outerTransition;
    return maxBlur * 0.5 + t * maxBlur * 0.5;
  }
  return maxBlur;
}
