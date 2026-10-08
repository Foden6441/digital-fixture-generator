import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; teamId: string }> }
) {
  const { id, teamId } = await params
  const session = await auth()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const membership = await prisma.competitionTeam.findUnique({
      where: { competitionId_teamId: { competitionId: id, teamId } }
    })
    if (!membership) {
      return NextResponse.json({ error: "Team is not part of this competition" }, { status: 404 })
    }

    const fixtureCount = await prisma.fixture.count({
      where: {
        competitionId: id,
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }]
      }
    })

    if (fixtureCount > 0) {
      return NextResponse.json(
        { error: "Clear this competition's fixtures before removing the team" },
        { status: 409 }
      )
    }

    await prisma.$transaction([
      prisma.venue.updateMany({
        where: { competitionId: id, homeTeamId: teamId },
        data: { homeTeamId: null }
      }),
      prisma.competitionTeam.delete({
        where: { competitionId_teamId: { competitionId: id, teamId } }
      })
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting team:", error)
    return NextResponse.json(
      { error: "Failed to delete team" },
      { status: 500 }
    )
  }
}
