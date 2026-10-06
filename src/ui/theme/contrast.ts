/** Luminancia relativa WCAG de un color `#RRGGBB`. */
export function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

/** Texto negro o blanco, el que mejor se lea sobre `background`. */
export function readableOn(background: string): string {
  return contrastRatio(background, '#FFFFFF') >= contrastRatio(background, '#121A2E') ? '#FFFFFF' : '#121A2E';
}
