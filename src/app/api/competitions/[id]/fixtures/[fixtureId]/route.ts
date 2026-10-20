import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
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
    const { matchDate, kickoffTime, venueId, status, notes } = body

    const fixture = await prisma.fixture.update({
      where: { id: fixtureId },
      data: {
        ...(matchDate !== undefined && { matchDate: matchDate ? new Date(matchDate) : null }),
        ...(kickoffTime !== undefined && { kickoffTime }),
        ...(venueId !== undefined && { venueId: venueId || null }),
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
        version: { increment: 1 }
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: "Fixture",
        entityId: fixtureId,
        action: "UPDATE",
        changes: JSON.stringify({
          matchDate,
          kickoffTime,
          venueId,
          status,
          notes
        }),
        performedBy: session.user.id
      }
    })

    return NextResponse.json(fixture)
  } catch (error) {
    console.error("Error updating fixture:", error)
    return NextResponse.json(
      { error: "Failed to update fixture" },
      { status: 500 }
    )
  }
}
