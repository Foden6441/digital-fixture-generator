import { cookies } from "next/headers"

export interface AppSession {
  user: { id: string; email: string; name?: string | null; role: string }
}

export async function auth(): Promise<AppSession | null> {
  const token = (await cookies()).get("dfg_session")?.value
  const api = process.env.GO_API_URL
  if (!token || !api) return null

  try {
    const response = await fetch(new URL("/api/auth/session", api), {
      headers: { Cookie: `dfg_session=${token}` },
      cache: "no-store",
    })
    if (!response.ok) return null
    return await response.json() as AppSession
  } catch {
    return null
  }
}
