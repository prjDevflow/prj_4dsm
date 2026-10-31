// Material 3 Expressive shapes from tokens.md, in a 0 0 100 100 viewBox centered at (50, 50).
const POINTS = 96;

/** Closed path for r(θ) = 50 × radiusAt(θ), optionally rotated (in radians). */
export const polarPath = (radiusAt: (theta: number) => number, rotation = 0) => {
  const points = Array.from({ length: POINTS }, (_, index) => {
    const theta = (index / POINTS) * 2 * Math.PI;
    const r = 50 * radiusAt(theta);
    const x = 50 + r * Math.cos(theta + rotation);
    const y = 50 + r * Math.sin(theta + rotation);
    return `${x.toFixed(1)} ${y.toFixed(1)}`;
  });
  return `M${points[0]} L${points.slice(1).join(' L')} Z`;
};

export const shapePaths = {
  cookie12: polarPath((theta) => 0.93 + 0.07 * Math.cos(12 * theta)),
  clover4: polarPath((theta) => 0.74 + 0.26 * Math.cos(4 * theta), Math.PI / 4),
  sun8: polarPath((theta) => 0.9 + 0.1 * Math.cos(8 * theta)),
  arch: 'M14 92V50a36 36 0 0 1 72 0v42a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6z',
  circle: 'M50 2a48 48 0 1 1 0 96a48 48 0 0 1 0-96z',
};
