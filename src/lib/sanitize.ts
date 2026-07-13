export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim()
}

export function sanitizePhone(input: string): string {
  return input.replace(/[^0-9+\-\s()]/g, '').trim()
}

export function sanitizeNumber(input: string): string {
  return input.replace(/[^0-9.]/g, '')
}
