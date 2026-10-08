import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { isValidCompetitionLogo } from "@/lib/competitionLogo"

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
    const competition = await prisma.competition.findUnique({
      where: { id },
      include: {
        teamMemberships: { include: { team: true } },
        venueMemberships: { include: { venue: { include: { homeTeam: true } } } },
        fixtures: {
          include: {
            homeTeam: true,
            awayTeam: true,
            venue: true
          },
          orderBy: [
            { matchday: "asc" },
            { matchDate: "asc" }
          ]
        }
      }
    })

    if (!competition) {
      return NextResponse.json({ error: "Competition not found" }, { status: 404 })
    }

    const { teamMemberships, venueMemberships, ...competitionData } = competition
    return NextResponse.json({
      ...competitionData,
      teams: teamMemberships.map(({ team }) => team),
      venues: venueMemberships.map(({ venue }) => venue)
    })
  } catch (error) {
    console.error("Error fetching competition:", error)
    return NextResponse.json(
      { error: "Failed to fetch competition" },
      { status: 500 }
    )
  }
}

export async function PATCH(
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
    const { name, description, logo, primaryColor, season, startDate, endDate, status, format, groupSize } = body

    if (logo !== undefined && logo !== null && !isValidCompetitionLogo(logo)) {
      return NextResponse.json(
        { error: "Upload a PNG or JPEG logo smaller than 2 MB" },
        { status: 400 }
      )
    }

    if (primaryColor !== undefined && (typeof primaryColor !== "string" || !/^#[0-9a-fA-F]{6}$/.test(primaryColor))) {
      return NextResponse.json(
        { error: "Choose a valid six-digit competition color" },
        { status: 400 }
      )
    }

    if (format === "GROUP_STAGE" && groupSize !== undefined && (!Number.isInteger(groupSize) || groupSize < 3 || groupSize > 6)) {
      return NextResponse.json(
        { error: "Group stage requires 3 to 6 teams per group" },
        { status: 400 }
      )
    }

    const competition = await prisma.competition.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(logo !== undefined && { logo }),
        ...(primaryColor !== undefined && { primaryColor }),
        ...(groupSize !== undefined && { groupSize }),
        ...(season !== undefined && { season }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: new Date(endDate) }),
        ...(status !== undefined && { status }),
        ...(format !== undefined && { format })
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: "Competition",
        entityId: id,
        action: "UPDATE",
        changes: JSON.stringify({
          name,
          description,
          logoUpdated: logo !== undefined,
          primaryColor,
          groupSize,
          season,
          startDate,
          endDate,
          status,
          format
        }),
        performedBy: session.user.id
      }
    })

    return NextResponse.json(competition)
  } catch (error) {
    console.error("Error updating competition:", error)
    return NextResponse.json(
      { error: "Failed to update competition" },
      { status: 500 }
    )
  }
}
