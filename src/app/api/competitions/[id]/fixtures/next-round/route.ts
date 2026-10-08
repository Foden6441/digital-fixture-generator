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
    const { qualifiedTeamIds } = body

    if (!Array.isArray(qualifiedTeamIds) || qualifiedTeamIds.length < 2) {
      return NextResponse.json(
        { error: "At least 2 qualified teams are required" },
        { status: 400 }
      )
    }

    if (qualifiedTeamIds.length % 2 !== 0) {
      return NextResponse.json(
        { error: "Qualified teams must be an even number" },
        { status: 400 }
      )
    }

    const competition = await prisma.competition.findUnique({
      where: { id },
      select: { format: true }
    })

    if (!competition || competition.format !== "KNOCKOUT") {
      return NextResponse.json(
        { error: "This feature is only available for knockout competitions" },
        { status: 400 }
      )
    }

    const currentMatchday = await prisma.fixture.findFirst({
      where: { competitionId: id },
      orderBy: { matchday: "desc" },
      select: { matchday: true }
    })

    const nextMatchday = (currentMatchday?.matchday || 0) + 1

    const fixtures = await prisma.$transaction(async (transaction) => {
      const newFixtures = []
      for (let i = 0; i < qualifiedTeamIds.length / 2; i++) {
        const fixture = await transaction.fixture.create({
          data: {
            competitionId: id,
            homeTeamId: qualifiedTeamIds[i * 2],
            awayTeamId: qualifiedTeamIds[i * 2 + 1],
            matchday: nextMatchday,
            status: "SCHEDULED"
          }
        })
        newFixtures.push(fixture)
      }

      await transaction.auditLog.create({
        data: {
          entityType: "Competition",
          entityId: id,
          action: "GENERATE_NEXT_KNOCKOUT_ROUND",
          changes: JSON.stringify({
            matchday: nextMatchday,
            qualifiedTeamIds,
            fixtureCount: newFixtures.length
          }),
          performedBy: session.user.id
        }
      })

      return newFixtures
    })

    return NextResponse.json({
      success: true,
      matchday: nextMatchday,
      fixtures
    })
  } catch (error) {
    console.error("Error generating next knockout round:", error)
    return NextResponse.json(
      { error: "Failed to generate next knockout round" },
      { status: 500 }
    )
  }
}
