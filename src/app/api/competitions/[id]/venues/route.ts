import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const memberships = await prisma.competitionVenue.findMany({
      where: { competitionId: id },
      include: { venue: { include: { homeTeam: true } } },
      orderBy: { venue: { name: "asc" } }
    })

    return NextResponse.json(memberships.map(({ venue }) => venue))
  } catch (error) {
    console.error("Error fetching venues:", error)
    return NextResponse.json(
      { error: "Failed to fetch venues" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { venueId, name, location, capacity, homeTeamId } = await request.json()
    if (venueId !== undefined && typeof venueId !== "string") {
      return NextResponse.json({ error: "Invalid venue selection" }, { status: 400 })
    }
    if (!venueId && (typeof name !== "string" || !name.trim())) {
      return NextResponse.json({ error: "Choose an existing venue or enter a venue name" }, { status: 400 })
    }

    if (venueId) {
      const existingMembership = await prisma.competitionVenue.findUnique({
        where: { competitionId_venueId: { competitionId: id, venueId } }
      })
      if (existingMembership) {
        return NextResponse.json({ error: "This venue is already in the competition" }, { status: 409 })
      }
    }

    const result = await prisma.$transaction(async (transaction) => {
      const venue = venueId
        ? await transaction.venue.findUnique({ where: { id: venueId } })
        : await transaction.venue.create({
            data: {
              name: name.trim(),
              location: typeof location === "string" && location.trim() ? location.trim() : null,
              capacity: typeof capacity === "number" ? capacity : null,
              homeTeamId: homeTeamId || null
            }
          })

      if (!venue) return null

      await transaction.competitionVenue.create({
        data: { competitionId: id, venueId: venue.id }
      })

      return venue
    })

    if (!result) return NextResponse.json({ error: "Venue not found" }, { status: 404 })
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error creating venue:", error)
    return NextResponse.json(
      { error: "Failed to create venue" },
      { status: 500 }
    )
  }
}
