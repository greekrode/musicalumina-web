export function getJuryGridClassName(jurorCount: number): string {
  if (jurorCount <= 1) {
    return "grid grid-cols-1 gap-8";
  }

  if (jurorCount === 2 || jurorCount === 4) {
    return "grid grid-cols-1 md:grid-cols-2 gap-8";
  }

  return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8";
}
