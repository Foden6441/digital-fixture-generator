export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const session = await auth()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const venues = await prisma.venue.findMany({
      orderBy: { name: "asc" }
    })

    return NextResponse.json(venues)
  } catch (error) {
    console.error("Error fetching venues:", error)
    return NextResponse.json(
      { error: "Failed to fetch venues" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const session = await auth()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, location, capacity } = body

    const venue = await prisma.venue.create({
      data: {
        name,
        location,
        capacity
      }
    })

    return NextResponse.json(venue)
  } catch (error) {
    console.error("Error creating venue:", error)
    return NextResponse.json(
      { error: "Failed to create venue" },
      { status: 500 }
    )
  }
}
