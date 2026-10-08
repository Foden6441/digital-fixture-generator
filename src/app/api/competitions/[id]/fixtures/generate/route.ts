import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { generateFixtures, validateFixtureGeneration } from "@/lib/fixtureGenerator"

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
    // Get competition details
    const competition = await prisma.competition.findUnique({
      where: { id }
    })

    if (!competition) {
      return NextResponse.json({ error: "Competition not found" }, { status: 404 })
    }

    // Get teams
    const memberships = await prisma.competitionTeam.findMany({
      where: { competitionId: id },
      include: { team: true },
      orderBy: { team: { name: "asc" } }
    })
    const teams = memberships.map(({ team }) => team)

    // Validate
    const validation = validateFixtureGeneration(teams, competition.format, competition.groupSize)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // Check if fixtures already exist
    const existingFixtures = await prisma.fixture.count({
      where: { competitionId: id }
    })

    if (existingFixtures > 0) {
      return NextResponse.json(
        { error: "Fixtures already exist. Clear them first to regenerate." },
        { status: 400 }
      )
    }

    // Generate fixtures
    const generatedFixtures = generateFixtures(teams, competition.format, competition.groupSize)

    // Create fixtures in database
    const fixtures = await prisma.fixture.createMany({
      data: generatedFixtures.map((fixture) => ({
        competitionId: id,
        homeTeamId: fixture.homeTeamId,
        awayTeamId: fixture.awayTeamId,
        matchday: fixture.matchday,
        groupNumber: fixture.groupNumber ?? null,
        status: "SCHEDULED"
      }))
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: "Competition",
        entityId: id,
        action: "GENERATE_FIXTURES",
        changes: JSON.stringify({
          format: competition.format,
          teamCount: teams.length,
          fixtureCount: fixtures.count
        }),
        performedBy: session.user.id
      }
    })

    return NextResponse.json({
      success: true,
      fixtureCount: fixtures.count
    })
  } catch (error) {
    console.error("Error generating fixtures:", error)
    return NextResponse.json(
      { error: "Failed to generate fixtures" },
      { status: 500 }
    )
  }
}
