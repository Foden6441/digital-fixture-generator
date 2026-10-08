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
    const memberships = await prisma.competitionTeam.findMany({
      where: { competitionId: id },
      include: { team: true },
      orderBy: { team: { name: "asc" } }
    })

    return NextResponse.json(memberships.map(({ team }) => team))
  } catch (error) {
    console.error("Error fetching teams:", error)
    return NextResponse.json(
      { error: "Failed to fetch teams" },
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
    const { teamId, name, abbreviation } = await request.json()
    if (teamId !== undefined && typeof teamId !== "string") {
      return NextResponse.json({ error: "Invalid team selection" }, { status: 400 })
    }
    if (!teamId && (typeof name !== "string" || !name.trim())) {
      return NextResponse.json({ error: "Choose an existing team or enter a team name" }, { status: 400 })
    }

    if (teamId) {
      const existingMembership = await prisma.competitionTeam.findUnique({
        where: { competitionId_teamId: { competitionId: id, teamId } }
      })
      if (existingMembership) {
        return NextResponse.json({ error: "This team is already in the competition" }, { status: 409 })
      }
    }

    const result = await prisma.$transaction(async (transaction) => {
      const team = teamId
        ? await transaction.team.findUnique({ where: { id: teamId } })
        : await transaction.team.create({
            data: {
              name: name.trim(),
              abbreviation: typeof abbreviation === "string" && abbreviation.trim() ? abbreviation.trim() : null
            }
          })

      if (!team) return null

      await transaction.competitionTeam.create({
        data: { competitionId: id, teamId: team.id }
      })

      return team
    })

    if (!result) return NextResponse.json({ error: "Team not found" }, { status: 404 })
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error creating team:", error)
    return NextResponse.json(
      { error: "Failed to create team" },
      { status: 500 }
    )
  }
}
