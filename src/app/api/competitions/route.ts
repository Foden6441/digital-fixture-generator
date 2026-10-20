export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { isValidCompetitionLogo } from "@/lib/competitionLogo"

export async function POST(request: NextRequest) {
  const session = await auth()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      name,
      description,
      logo,
      primaryColor,
      season,
      startDate,
      endDate,
      format,
      groupSize,
      existingTeamIds = [],
      newTeams = []
    } = body

    if (primaryColor !== undefined && (typeof primaryColor !== "string" || !/^#[0-9a-fA-F]{6}$/.test(primaryColor))) {
      return NextResponse.json(
        { error: "Choose a valid six-digit competition color" },
        { status: 400 }
      )
    }

    if (logo !== undefined && logo !== null && !isValidCompetitionLogo(logo)) {
      return NextResponse.json(
        { error: "Upload a PNG or JPEG logo smaller than 2 MB" },
        { status: 400 }
      )
    }

    if (format === "GROUP_STAGE" && (!Number.isInteger(groupSize) || groupSize < 3 || groupSize > 6)) {
      return NextResponse.json(
        { error: "Group stage requires 3 to 6 teams per group" },
        { status: 400 }
      )
    }

    if (!Array.isArray(existingTeamIds) || !existingTeamIds.every((id) => typeof id === "string") ||
        !Array.isArray(newTeams) || newTeams.some((team) => !team || typeof team.name !== "string" || !team.name.trim())) {
      return NextResponse.json({ error: "Choose existing teams or enter valid new team names" }, { status: 400 })
    }

    const uniqueTeamIds = [...new Set(existingTeamIds)]
    if (uniqueTeamIds.length !== existingTeamIds.length || uniqueTeamIds.length + newTeams.length > 200) {
      return NextResponse.json({ error: "Team selection is invalid or exceeds the 200-team limit" }, { status: 400 })
    }

    if (uniqueTeamIds.length > 0) {
      const existingCount = await prisma.team.count({ where: { id: { in: uniqueTeamIds } } })
      if (existingCount !== uniqueTeamIds.length) {
        return NextResponse.json({ error: "One or more selected teams no longer exist" }, { status: 400 })
      }
    }

    const competition = await prisma.$transaction(async (transaction) => {
      const createdCompetition = await transaction.competition.create({
        data: {
          name,
          description,
          logo: logo || null,
          primaryColor: primaryColor ?? "#191B52",
          groupSize: format === "GROUP_STAGE" ? groupSize : 4,
          season,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          format,
          createdBy: session.user.id
        }
      })

      const createdTeams = []
      for (const team of newTeams) {
        createdTeams.push(await transaction.team.create({
          data: {
            name: team.name.trim(),
            abbreviation: typeof team.abbreviation === "string" && team.abbreviation.trim()
              ? team.abbreviation.trim()
              : null
          },
          select: { id: true }
        }))
      }

      const teamIds = [...uniqueTeamIds, ...createdTeams.map((team) => team.id)]
      if (teamIds.length > 0) {
        await transaction.competitionTeam.createMany({
          data: teamIds.map((teamId) => ({ competitionId: createdCompetition.id, teamId }))
        })
      }

      return createdCompetition
    })

    return NextResponse.json(competition)
  } catch (error) {
    console.error("Error creating competition:", error)
    return NextResponse.json(
      { error: "Failed to create competition" },
      { status: 500 }
    )
  }
}

export async function GET() {
  const session = await auth()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const competitions = await prisma.competition.findMany({
      include: {
        _count: {
          select: {
            teamMemberships: true,
            fixtures: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    return NextResponse.json(competitions)
  } catch (error) {
    console.error("Error fetching competitions:", error)
    return NextResponse.json(
      { error: "Failed to fetch competitions" },
      { status: 500 }
    )
  }
}
