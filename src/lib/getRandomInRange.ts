export function getRandomInRange(min: number, max: number): number {
  if (min > max) [min, max] = [max, min]; // swap if min > max
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
