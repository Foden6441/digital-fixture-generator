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
    const fixtures = await prisma.fixture.findMany({
      where: { competitionId: id },
      include: {
        homeTeam: true,
        awayTeam: true,
        venue: true
      },
      orderBy: [
        { matchday: "asc" },
        { matchDate: "asc" }
      ]
    })

    return NextResponse.json(fixtures)
  } catch (error) {
    console.error("Error fetching fixtures:", error)
    return NextResponse.json(
      { error: "Failed to fetch fixtures" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await prisma.fixture.deleteMany({
      where: { competitionId: id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting fixtures:", error)
    return NextResponse.json(
      { error: "Failed to delete fixtures" },
      { status: 500 }
    )
  }
}
