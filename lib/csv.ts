type CsvPrimitive = string | number | boolean | null | undefined | Date;

function stringifyCsvValue(value: CsvPrimitive): string {
  if (value === null || value === undefined) return "";
  const asString = value instanceof Date ? value.toISOString() : String(value);
  const escaped = asString.replace(/"/g, "\"\"");
  if (/[",\n\r]/.test(escaped)) {
    return `"${escaped}"`;
  }
  return escaped;
}

export function buildCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: Array<keyof T>
): string {
  const header = columns.map((c) => String(c)).join(",");
  const lines = rows.map((row) =>
    columns
      .map((col) => stringifyCsvValue(row[col] as CsvPrimitive))
      .join(",")
  );
  return [header, ...lines].join("\n");
}

export function toSlugPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
