import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fixtureId: string }> }
) {
  const { id, fixtureId } = await params
  const session = await auth()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { matchDate, kickoffTime, venueId } = body

    // Get the original fixture
    const originalFixture = await prisma.fixture.findUnique({
      where: { id: fixtureId }
    })

    if (!originalFixture) {
      return NextResponse.json({ error: "Fixture not found" }, { status: 404 })
    }

    // Create a new fixture with the same teams but new date/time
    const newFixture = await prisma.fixture.create({
      data: {
        competitionId: id,
        homeTeamId: originalFixture.homeTeamId,
        awayTeamId: originalFixture.awayTeamId,
        venueId: venueId || originalFixture.venueId,
        matchDate: matchDate ? new Date(matchDate) : null,
        kickoffTime: kickoffTime || originalFixture.kickoffTime,
        matchday: originalFixture.matchday,
        status: "SCHEDULED",
        notes: `Rescheduled from ${originalFixture.matchDate ? new Date(originalFixture.matchDate).toLocaleDateString() : 'TBD'}`
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: "Fixture",
        entityId: newFixture.id,
        action: "RESCHEDULE",
        changes: JSON.stringify({
          originalFixtureId: fixtureId,
          newFixtureId: newFixture.id,
          matchDate,
          kickoffTime
        }),
        performedBy: session.user.id
      }
    })

    return NextResponse.json(newFixture)
  } catch (error) {
    console.error("Error rescheduling fixture:", error)
    return NextResponse.json(
      { error: "Failed to reschedule fixture" },
      { status: 500 }
    )
  }
}
