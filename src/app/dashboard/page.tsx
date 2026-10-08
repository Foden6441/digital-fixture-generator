import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

export default async function DashboardPage() {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

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

  // Get overall statistics
  const totalCompetitions = competitions.length
  const totalTeams = competitions.reduce((sum, comp) => sum + comp._count.teamMemberships, 0)
  const totalFixtures = competitions.reduce((sum, comp) => sum + comp._count.fixtures, 0)
  const activeCompetitions = competitions.filter(c => c.status === "PUBLISHED").length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold sm:text-2xl">Digital Fixture Generator</h1>
          <div className="flex min-w-0 items-center justify-between gap-3 sm:justify-end">
            <span className="min-w-0 break-all text-xs text-gray-600 sm:text-sm">{session.user.email}</span>
            <Button variant="outline" render={<Link href="/api/auth/signout" />} nativeButton={false}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-5 sm:py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-bold sm:text-3xl">Dashboard</h2>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" className="w-full sm:w-auto" render={<Link href="/teams" />} nativeButton={false}>
              Manage Teams
            </Button>
            <Button variant="outline" className="w-full sm:w-auto" render={<Link href="/venues" />} nativeButton={false}>
              Manage Venues
            </Button>
            <Button className="w-full sm:w-auto" render={<Link href="/competitions/new" />} nativeButton={false}>
              Create Competition
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Competitions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalCompetitions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Competitions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{activeCompetitions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Teams</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalTeams}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Fixtures</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalFixtures}</div>
            </CardContent>
          </Card>
        </div>

        <h3 className="mb-4 text-xl font-bold sm:text-2xl">Recent Competitions</h3>

        {competitions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 mb-4">No competitions created yet</p>
              <Button render={<Link href="/competitions/new" />} nativeButton={false}>
                Create Your First Competition
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {competitions.map((competition) => (
              <Card key={competition.id}>
                <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="break-words">{competition.name}</CardTitle>
                      <CardDescription>{competition.season}</CardDescription>
                    </div>
                    <Badge variant={competition.status === "PUBLISHED" ? "default" : "secondary"}>
                      {competition.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Format:</span>
                      <span className="font-medium">{competition.format.replace(/_/g, " ")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Teams:</span>
                      <span className="font-medium">{competition._count.teamMemberships}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fixtures:</span>
                      <span className="font-medium">{competition._count.fixtures}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Season:</span>
                      <span className="max-w-[65%] text-right font-medium sm:max-w-none">
                        {new Date(competition.startDate).toLocaleDateString()} - {new Date(competition.endDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Button className="w-full mt-4" render={<Link href={`/competitions/${competition.id}`} />} nativeButton={false}>
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
