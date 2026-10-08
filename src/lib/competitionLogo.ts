export function isValidCompetitionLogo(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2_800_000) return false

  const match = value.match(/^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/)
  if (!match) return false

  const [, declaredFormat, payload] = match
  const bytes = Buffer.from(payload, "base64")

  if (declaredFormat === "png") {
    return bytes.length >= 8 &&
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
      bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  }

  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
}
