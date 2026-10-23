/** Splits a list into consecutive parts of at most `size` items, e.g. for APIs that limit batch sizes. */
export function chunks<T>(items: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let start = 0; start < items.length; start += size) result.push(items.slice(start, start + size));
  return result;
}
