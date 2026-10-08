import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import CompetitionSidebar from "./competition-sidebar"

export default async function CompetitionLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ id: string }>
}>) {
  const { id } = await params
  const session = await auth()

  if (!session) redirect("/login")

  const competition = await prisma.competition.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      season: true,
      _count: {
        select: {
          teamMemberships: true,
          venueMemberships: true,
          fixtures: true
        }
      }
    }
  })

  if (!competition) notFound()

  return (
    <div className="min-h-screen bg-gray-50 lg:flex">
      <CompetitionSidebar
        competition={{
          id: competition.id,
          name: competition.name,
          season: competition.season,
          teamCount: competition._count.teamMemberships,
          venueCount: competition._count.venueMemberships,
          fixtureCount: competition._count.fixtures
        }}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
