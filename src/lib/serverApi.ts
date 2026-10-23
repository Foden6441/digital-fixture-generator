import { cookies } from "next/headers"

export async function backendJSON<T>(path: string): Promise<T | null> {
  const api = process.env.GO_API_URL
  const token = (await cookies()).get("dfg_session")?.value
  if (!api || !token) return null
  try {
    const response = await fetch(new URL(path, api), {
      headers: { Cookie: `dfg_session=${token}` },
      cache: "no-store",
    })
    if (!response.ok) return null
    return await response.json() as T
  } catch {
    return null
  }
}
