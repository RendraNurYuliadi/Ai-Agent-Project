export function generateUniqueName(
  baseName: string,
  existingNames: Iterable<string | null | undefined>
): string {
  const safeBase = (baseName ?? "").trim() || "Untitled";
  const normalizedBase = safeBase.replace(/\s+\(\d+\)\s*$/, "").trim() || "Untitled";
  const seen = new Set(
    Array.from(existingNames ?? [])
      .map((value) => typeof value === "string" ? value.trim() : "")
      .filter(Boolean)
  );

  if (!seen.has(safeBase)) return safeBase;

  let suffix = 1;
  let candidate = `${normalizedBase} (${suffix})`;
  while (seen.has(candidate)) {
    suffix += 1;
    candidate = `${normalizedBase} (${suffix})`;
  }
  return candidate;
}

export function generateUniqueCollectionName(
  baseCollectionName: string,
  existingNames: Iterable<string | null | undefined>
): string {
  const safeBase = (baseCollectionName ?? "").trim() || "collection";
  const normalizedBase = safeBase.replace(/_\d+$/, "") || "collection";
  const seen = new Set(
    Array.from(existingNames ?? [])
      .map((value) => typeof value === "string" ? value.trim() : "")
      .filter(Boolean)
  );

  if (!seen.has(safeBase)) return safeBase;

  let suffix = 1;
  let candidate = `${normalizedBase}_${suffix}`;
  while (seen.has(candidate)) {
    suffix += 1;
    candidate = `${normalizedBase}_${suffix}`;
  }
  return candidate;
}
