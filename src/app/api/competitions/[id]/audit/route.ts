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
    // Get competition audit logs
    const competitionLogs = await prisma.auditLog.findMany({
      where: {
        entityType: "Competition",
        entityId: id
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    // Get fixture IDs for this competition
    const fixtures = await prisma.fixture.findMany({
      where: { competitionId: id },
      select: { id: true }
    })

    const fixtureIds = fixtures.map(f => f.id)

    // Get fixture audit logs
    const fixtureLogs = await prisma.auditLog.findMany({
      where: {
        entityType: "Fixture",
        entityId: { in: fixtureIds }
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    // Combine and sort by date
    const allLogs = [...competitionLogs, ...fixtureLogs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    return NextResponse.json(allLogs)
  } catch (error) {
    console.error("Error fetching audit logs:", error)
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    )
  }
}
