import { NextRequest, NextResponse } from "next/server"

export async function goProxy(request: NextRequest) {
  const api = process.env.GO_API_URL
  if (!api) return NextResponse.json({ error: "Go API is not configured" }, { status: 503 })
  const target = new URL(request.nextUrl.pathname + request.nextUrl.search, api)
  const headers = new Headers(request.headers)
  headers.delete("host")
  headers.delete("content-length")
  try {
    const response = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
      cache: "no-store",
      redirect: "manual",
    })
    const responseHeaders = new Headers(response.headers)
    responseHeaders.delete("content-encoding")
    responseHeaders.delete("content-length")
    return new NextResponse(response.body, { status: response.status, headers: responseHeaders })
  } catch {
    return NextResponse.json({ error: "Go API is unavailable" }, { status: 502 })
  }
}
