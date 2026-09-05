export function latinizeDigits(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0));
}

export function formatWesternNumber(value: number | null | undefined) {
  return String(Math.trunc(Number(value ?? 0))).replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660));
}
