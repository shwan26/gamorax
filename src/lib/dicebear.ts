export function botttsUrl(seed: string, size = 96) {
  const params = new URLSearchParams({
    seed,
    size: String(size),
    // optional nice background
    backgroundType: "gradientLinear",
    backgroundColor: "b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf",
  });

  // Use PNG to work smoothly with next/image
  return `https://api.dicebear.com/9.x/bottts/png?${params.toString()}`;
}

export function randomSeed() {
  // browser-safe random
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
