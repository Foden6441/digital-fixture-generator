import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { createAutomaticSchedule } from "@/lib/autoSchedule"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const competition = await prisma.competition.findUnique({
    where: { id },
    select: { startDate: true, endDate: true, format: true }
  })

  if (!competition) {
    return NextResponse.json({ error: "Competition not found" }, { status: 404 })
  }

  const fixtures = await prisma.fixture.findMany({
    where: { competitionId: id },
    select: {
      id: true,
      matchday: true,
      homeTeam: {
        select: {
          homeVenue: {
            select: { id: true }
          }
        }
      }
    },
    orderBy: [{ matchday: "asc" }, { id: "asc" }]
  })

  const competitionVenues = await prisma.competitionVenue.findMany({
    where: { competitionId: id },
    select: { venueId: true }
  })

  const venueIdsInCompetition = new Set(competitionVenues.map((cv) => cv.venueId))

  let assignments: ReturnType<typeof createAutomaticSchedule>
  try {
    assignments = createAutomaticSchedule(
      fixtures,
      competition.startDate,
      competition.endDate,
      competition.format === "KNOCKOUT"
    )
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.error("Unexpected schedule validation error:", error)
    return NextResponse.json(
      { error: "Failed to automate schedule" },
      { status: 500 }
    )
  }

  const fixtureById = new Map(fixtures.map((fixture) => [fixture.id, fixture]))

  try {
    await prisma.$transaction(async (transaction) => {
      await Promise.all(assignments.map((assignment) => {
        const fixture = fixtureById.get(assignment.fixtureId)
        const homeVenue = fixture?.homeTeam.homeVenue
        const venueId = homeVenue && venueIdsInCompetition.has(homeVenue.id) ? homeVenue.id : undefined

        return transaction.fixture.update({
          where: { id: assignment.fixtureId },
          data: {
            matchDate: new Date(`${assignment.matchDate}T12:00:00.000Z`),
            kickoffTime: assignment.kickoffTime,
            ...(venueId ? { venueId } : {}),
            version: { increment: 1 }
          }
        })
      }))

      await transaction.auditLog.create({
        data: {
          entityType: "Competition",
          entityId: id,
          action: "AUTO_SCHEDULE_FIXTURES",
          changes: JSON.stringify({
            fixtureCount: assignments.length,
            firstDate: assignments[0].matchDate,
            lastDate: assignments[assignments.length - 1].matchDate,
            matchdays: new Set(fixtures.map((fixture) => fixture.matchday)).size
          }),
          performedBy: session.user.id
        }
      })
    })

    return NextResponse.json({
      success: true,
      fixtureCount: assignments.length,
      schedule: assignments
    })
  } catch (error) {
    console.error("Error saving automatic fixture schedule:", error)
    return NextResponse.json(
      { error: "Failed to save the automatic fixture schedule" },
      { status: 500 }
    )
  }
}
