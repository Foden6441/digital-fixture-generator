import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { backendJSON } from "@/lib/serverApi"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import FixtureExport from "./fixture-export"
import EditCompetition from "./edit-competition"

export default async function CompetitionDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  const [competitionData, teamsData, venuesData, fixturesData] = await Promise.all([
    backendJSON<Record<string, any>>(`/api/competitions/${id}`),
    backendJSON<Array<Record<string, any>>>(`/api/competitions/${id}/teams`),
    backendJSON<Array<Record<string, any>>>(`/api/competitions/${id}/venues`),
    backendJSON<Array<Record<string, any>>>(`/api/competitions/${id}/fixtures`),
  ])
  const competition: (Record<string, any> & {
    teamMemberships: Array<{ team: Record<string, any> }>
    venueMemberships: Array<{ venue: Record<string, any> }>
    fixtures: Array<Record<string, any>>
  }) | null = competitionData ? {
    ...competitionData,
    teamMemberships: (teamsData ?? []).map((team) => ({ team })),
    venueMemberships: (venuesData ?? []).map((venue) => ({ venue })),
    fixtures: fixturesData ?? [],
  } : null

  if (!competition) {
    return <div>Competition not found</div>
  }

  const teams = competition.teamMemberships.map(({ team }) => team)
  const venues = competition.venueMemberships.map(({ venue }) => venue)

  const competitionForClient = {
    id: competition.id,
    name: competition.name,
    description: competition.description,
    logo: competition.logo,
    primaryColor: competition.primaryColor,
    groupSize: competition.groupSize,
    season: competition.season,
    startDate: new Date(competition.startDate).toISOString(),
    endDate: new Date(competition.endDate).toISOString(),
    format: competition.format
  }
  const fixturesForExport = competition.fixtures.map((fixture) => ({
    matchday: fixture.matchday,
    groupNumber: fixture.groupNumber,
    homeTeam: { name: fixture.homeTeam.name },
    awayTeam: { name: fixture.awayTeam.name },
    venue: fixture.venue ? { name: fixture.venue.name } : null,
    matchDate: fixture.matchDate ? new Date(fixture.matchDate).toISOString() : null,
    kickoffTime: fixture.kickoffTime,
    status: fixture.status
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" render={<Link href="/dashboard" />} nativeButton={false}>
            ← Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto min-w-0 px-4 py-5 sm:py-8">
        <div className="mb-6 flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-bold sm:text-3xl">{competition.name}</h1>
            <p className="text-gray-600">{competition.season}</p>
            <div className="flex gap-2 mt-2">
              <Badge>{competition.status}</Badge>
              <Badge variant="outline">{competition.format.replace(/_/g, " ")}</Badge>
            </div>
          </div>
          <div className="self-start"><EditCompetition competition={competitionForClient} /></div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="max-w-full overflow-x-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="teams">Teams ({teams.length})</TabsTrigger>
            <TabsTrigger value="venues">Venues ({venues.length})</TabsTrigger>
            <TabsTrigger value="fixtures">Fixtures ({competition.fixtures.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Competition Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                  <span className="text-gray-600">Description:</span>
                  <span className="break-words sm:text-right">{competition.description || "N/A"}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-600">Start Date:</span>
                  <span>{new Date(competition.startDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-600">End Date:</span>
                  <span>{new Date(competition.endDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-600">Total Teams:</span>
                  <span>{teams.length}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-600">Total Venues:</span>
                  <span>{venues.length}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-600">Total Fixtures:</span>
                  <span>{competition.fixtures.length}</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="teams">
            <Card>
              <CardHeader>
                <CardTitle>Registered Teams</CardTitle>
                <CardDescription>Teams participating in this competition</CardDescription>
              </CardHeader>
              <CardContent>
                {teams.length === 0 ? (
                  <p className="text-gray-500">No teams registered yet</p>
                ) : (
                  <div className="grid gap-2">
                    {teams.map((team) => (
                      <div key={team.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <div className="font-medium">{team.name}</div>
                          {team.abbreviation && (
                            <div className="text-sm text-gray-600">{team.abbreviation}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="venues">
            <Card>
              <CardHeader>
                <CardTitle>Registered Venues</CardTitle>
                <CardDescription>Stadiums and venues for matches</CardDescription>
              </CardHeader>
              <CardContent>
                {venues.length === 0 ? (
                  <p className="text-gray-500">No venues registered yet</p>
                ) : (
                  <div className="grid gap-2">
                    {venues.map((venue) => (
                      <div key={venue.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <div className="font-medium">{venue.name}</div>
                          {venue.location && (
                            <div className="text-sm text-gray-600">{venue.location}</div>
                          )}
                          {venue.capacity && (
                            <div className="text-sm text-gray-600">Capacity: {venue.capacity}</div>
                          )}
                          {venue.homeTeam && (
                            <div className="text-sm text-gray-600">Home team: {venue.homeTeam.name}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fixtures">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Fixtures</CardTitle>
                    <CardDescription>Scheduled matches</CardDescription>
                  </div>
                  {competition.fixtures.length > 0 && (
                    <FixtureExport competition={competitionForClient} fixtures={fixturesForExport} />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {competition.fixtures.length === 0 ? (
                  <p className="text-gray-500">No fixtures generated yet</p>
                ) : (
                  <div className="space-y-2">
                    {competition.fixtures.map((fixture) => (
                      <div key={fixture.id} className="p-3 border rounded">
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className="font-medium">
                              {fixture.homeTeam.name} vs {fixture.awayTeam.name}
                            </div>
                            <div className="text-sm text-gray-600">
                              {fixture.venue?.name || "Venue not assigned"}
                            </div>
                          </div>
                          <div className="text-right">
                            {fixture.matchDate && (
                              <div className="text-sm">
                                {new Date(fixture.matchDate).toLocaleDateString()}
                              </div>
                            )}
                            {fixture.kickoffTime && (
                              <div className="text-sm text-gray-600">{fixture.kickoffTime}</div>
                            )}
                            <Badge variant="outline" className="mt-1">
                              {fixture.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
