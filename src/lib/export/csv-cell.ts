export function csvCell(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function rowsToCsv(header: string[], rows: string[][]): string {
  return [header.join(","), ...rows.map((row) => row.join(","))].join("\n");
}
