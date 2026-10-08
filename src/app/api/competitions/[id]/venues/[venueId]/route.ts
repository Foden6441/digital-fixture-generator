import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; venueId: string }> }
) {
  const { id, venueId } = await params
  const session = await auth()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await prisma.competitionVenue.delete({
      where: { competitionId_venueId: { competitionId: id, venueId } }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing venue:", error)
    return NextResponse.json(
      { error: "Failed to remove venue" },
      { status: 500 }
    )
  }
}
