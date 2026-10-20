import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

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
    const body = await request.json()
    const { fixtureId, matchDate, kickoffTime, venueId } = body

    const conflicts: string[] = []

    // Get the fixture being updated to know which teams are involved
    const fixture = await prisma.fixture.findUnique({
      where: { id: fixtureId },
      include: {
        homeTeam: true,
        awayTeam: true
      }
    })

    if (!fixture) {
      return NextResponse.json({ error: "Fixture not found" }, { status: 404 })
    }

    // Check for venue conflicts (same venue, same date and time)
    const venueConflicts = await prisma.fixture.findMany({
      where: {
        id: { not: fixtureId },
        competitionId: id,
        venueId,
        matchDate: new Date(matchDate),
        kickoffTime,
        status: { not: "CANCELLED" }
      },
      include: {
        homeTeam: true,
        awayTeam: true
      }
    })

    if (venueConflicts.length > 0) {
      venueConflicts.forEach((conflict) => {
        conflicts.push(
          `Venue conflict: ${conflict.homeTeam.name} vs ${conflict.awayTeam.name} is already scheduled at this venue at the same time`
        )
      })
    }

    // Check for team conflicts (same team playing at the same time)
    const teamConflicts = await prisma.fixture.findMany({
      where: {
        id: { not: fixtureId },
        competitionId: id,
        matchDate: new Date(matchDate),
        kickoffTime,
        status: { not: "CANCELLED" },
        OR: [
          { homeTeamId: fixture.homeTeamId },
          { awayTeamId: fixture.homeTeamId },
          { homeTeamId: fixture.awayTeamId },
          { awayTeamId: fixture.awayTeamId }
        ]
      },
      include: {
        homeTeam: true,
        awayTeam: true
      }
    })

    if (teamConflicts.length > 0) {
      teamConflicts.forEach((conflict) => {
        conflicts.push(
          `Team conflict: ${fixture.homeTeam.name} or ${fixture.awayTeam.name} is already scheduled to play at this time (${conflict.homeTeam.name} vs ${conflict.awayTeam.name})`
        )
      })
    }

    return NextResponse.json({ conflicts })
  } catch (error) {
    console.error("Error checking conflicts:", error)
    return NextResponse.json(
      { error: "Failed to check conflicts" },
      { status: 500 }
    )
  }
}
