"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileDown, FileSpreadsheet, Trophy } from "lucide-react"
import { exportFixturesToExcel, exportFixturesToPDF } from "@/lib/exportFixtures"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Team {
  id: string
  name: string
}

interface Fixture {
  id: string
  homeTeam: Team
  awayTeam: Team
  venue: { id: string; name: string } | null
  matchday: number | null
  groupNumber: number | null
  matchDate: string | null
  kickoffTime: string | null
  status: string
}

interface Competition {
  name: string
  season: string
  description: string | null
  logo: string | null
  primaryColor: string
  startDate: string
  endDate: string
  format: string
}

export default function FixturesPage() {
  const router = useRouter()
  const params = useParams()
  const [competition, setCompetition] = useState<Competition | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState("")
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generatingNextRound, setGeneratingNextRound] = useState(false)
  const [error, setError] = useState("")
  const [nextRoundDialogOpen, setNextRoundDialogOpen] = useState(false)
  const [qualifiedTeamIds, setQualifiedTeamIds] = useState<string[]>([])

  useEffect(() => {
    const loadData = async () => {
      try {
        const [compRes, teamsRes, fixturesRes] = await Promise.all([
          fetch(`/api/competitions/${params.id}`),
          fetch(`/api/competitions/${params.id}/teams`),
          fetch(`/api/competitions/${params.id}/fixtures`)
        ])

        if (compRes.ok) setCompetition(await compRes.json())
        if (teamsRes.ok) setTeams(await teamsRes.json())
        if (fixturesRes.ok) setFixtures(await fixturesRes.json())
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [params.id])

  const fetchData = async () => {
    try {
      const [compRes, teamsRes, fixturesRes] = await Promise.all([
        fetch(`/api/competitions/${params.id}`),
        fetch(`/api/competitions/${params.id}/teams`),
        fetch(`/api/competitions/${params.id}/fixtures`)
      ])

      if (compRes.ok) setCompetition(await compRes.json())
      if (teamsRes.ok) setTeams(await teamsRes.json())
      if (fixturesRes.ok) setFixtures(await fixturesRes.json())
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateFixtures = async () => {
    setError("")
    setGenerating(true)

    try {
      const response = await fetch(`/api/competitions/${params.id}/fixtures/generate`, {
        method: "POST"
      })

      const data = await response.json()

      if (response.ok) {
        fetchData()
      } else {
        setError(data.error || "Failed to generate fixtures")
      }
    } catch (error) {
      setError("An error occurred while generating fixtures")
    } finally {
      setGenerating(false)
    }
  }

  const handleClearFixtures = async () => {
    if (!confirm("Are you sure you want to clear all fixtures? This cannot be undone.")) return

    try {
      const response = await fetch(`/api/competitions/${params.id}/fixtures`, {
        method: "DELETE"
      })

      if (response.ok) {
        fetchData()
      } else {
        alert("Failed to clear fixtures")
      }
    } catch (error) {
      alert("An error occurred")
    }
  }

  const handleGenerateNextRound = async () => {
    if (qualifiedTeamIds.length < 2) {
      alert("Please select at least 2 qualified teams")
      return
    }

    if (qualifiedTeamIds.length % 2 !== 0) {
      alert("Qualified teams must be an even number")
      return
    }

    setGeneratingNextRound(true)
    setError("")

    try {
      const response = await fetch(`/api/competitions/${params.id}/fixtures/next-round`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qualifiedTeamIds })
      })

      const data = await response.json()

      if (response.ok) {
        setNextRoundDialogOpen(false)
        setQualifiedTeamIds([])
        fetchData()
      } else {
        setError(data.error || "Failed to generate next round")
      }
    } catch (error) {
      setError("An error occurred while generating next round")
    } finally {
      setGeneratingNextRound(false)
    }
  }

  const getRoundName = (matchday: number): string => {
    const roundNames = ["Round 1", "Round 2", "Quarterfinals", "Semifinals", "Final"]
    const totalRounds = Math.ceil(Math.log2(fixtures.length * 2))
    const roundIndex = totalRounds - matchday
    return roundNames[roundIndex] || `Round ${matchday}`
  }

  const canGenerateNextRound = competition?.format === "KNOCKOUT" && fixtures.length > 0

  const selectedTeam = teams.find((team) => team.id === selectedTeamId)
  const visibleFixtures = selectedTeamId
    ? fixtures.filter((fixture) =>
        fixture.homeTeam.id === selectedTeamId || fixture.awayTeam.id === selectedTeamId
      )
    : fixtures

  const handleExportPDF = (exportAll: boolean) => {
    if (!competition) return
    const exportFixtures = exportAll ? fixtures : visibleFixtures
    const teamName = !exportAll ? selectedTeam?.name : undefined
    exportFixturesToPDF(competition, exportFixtures, teamName)
  }

  const handleExportExcel = (exportAll: boolean) => {
    if (!competition) return
    const exportFixtures = exportAll ? fixtures : visibleFixtures
    const teamName = !exportAll ? selectedTeam?.name : undefined
    exportFixturesToExcel(competition, exportFixtures, teamName)
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-50 p-4 sm:p-8">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-4">
          <Button variant="ghost" onClick={() => router.back()}>
            ← Back
          </Button>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            {fixtures.length > 0 && (
              <Button className="min-w-0 px-2 text-xs sm:px-2.5 sm:text-sm" variant="outline" onClick={handleClearFixtures}>
                Clear Fixtures
              </Button>
            )}
            {canGenerateNextRound && (
              <Button
                className="min-w-0 px-2 text-xs sm:px-2.5 sm:text-sm"
                variant="outline"
                onClick={() => setNextRoundDialogOpen(true)}
              >
                <Trophy className="mr-1 h-4 w-4" />
                Next Round
              </Button>
            )}
            <Button
              className="min-w-0 px-2 text-xs sm:px-2.5 sm:text-sm"
              onClick={handleGenerateFixtures}
              disabled={generating || teams.length < 2}
            >
              {generating ? "Generating..." : "Generate Fixtures"}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-5 sm:py-8">
        <h1 className="mb-6 text-2xl font-bold sm:text-3xl">Fixture Management</h1>

        {error && (
          <Alert className="mb-6" variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Teams</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{teams.length}</div>
              <p className="text-sm text-gray-600">Registered teams</p>
            </CardContent>
          </Card>

          <Card className="col-span-2 md:col-span-1">
            <CardHeader>
              <CardTitle>Format</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {competition?.format?.replace(/_/g, " ")}
              </div>
              <p className="text-sm text-gray-600">Competition format</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fixtures</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{fixtures.length}</div>
              <p className="text-sm text-gray-600">Generated fixtures</p>
            </CardContent>
          </Card>
        </div>

        {teams.length < 2 && (
          <Alert className="mb-6">
            <AlertDescription>
              You need at least 2 teams to generate fixtures.{" "}
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => router.push(`/competitions/${params.id}/teams`)}
              >
                Add teams
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {fixtures.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 mb-4">No fixtures generated yet</p>
              <Button
                onClick={handleGenerateFixtures}
                disabled={generating || teams.length < 2}
              >
                Generate Fixtures
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Generated Fixtures</CardTitle>
                <CardDescription>
                  {selectedTeam
                    ? `${visibleFixtures.length} matches for ${selectedTeam.name}`
                    : `${fixtures.length} matches across ${Math.max(...fixtures.map((fixture) => fixture.matchday ?? 0))} matchdays`}
                </CardDescription>
              </div>
              <div className="grid w-full grid-cols-2 items-center gap-2 sm:w-auto sm:flex sm:flex-wrap">
                <Select
                  value={selectedTeamId || "all"}
                  onValueChange={(value) => setSelectedTeamId(value === "all" ? "" : value ?? "")}
                >
                  <SelectTrigger className="col-span-2 w-full sm:col-span-1 sm:min-w-44 sm:w-52" aria-label="Filter fixtures by team">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All teams</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  className="min-w-0 px-2 text-xs sm:px-2.5 sm:text-sm"
                  onClick={() => handleExportPDF(false)}
                  disabled={visibleFixtures.length === 0 || !competition}
                >
                  <FileDown aria-hidden="true" />
                  {selectedTeam ? "Team PDF" : "Export PDF"}
                </Button>
                <Button
                  variant="outline"
                  className="min-w-0 px-2 text-xs sm:px-2.5 sm:text-sm"
                  onClick={() => handleExportExcel(false)}
                  disabled={visibleFixtures.length === 0 || !competition}
                >
                  <FileSpreadsheet aria-hidden="true" />
                  {selectedTeam ? "Team Excel" : "Export Excel"}
                </Button>
                {selectedTeam && (
                  <>
                    <Button className="min-w-0 px-2 text-xs sm:px-2.5 sm:text-sm" variant="outline" onClick={() => handleExportPDF(true)} disabled={!competition}>
                      <FileDown aria-hidden="true" />
                      All fixtures PDF
                    </Button>
                    <Button className="min-w-0 px-2 text-xs sm:px-2.5 sm:text-sm" variant="outline" onClick={() => handleExportExcel(true)} disabled={!competition}>
                      <FileSpreadsheet aria-hidden="true" />
                      All fixtures Excel
                    </Button>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {visibleFixtures.length === 0 ? (
                <p className="py-8 text-center text-gray-500">
                  No fixtures found for {selectedTeam?.name ?? "this team"}.
                </p>
              ) : (
              <div className="space-y-4">
                {visibleFixtures.map((fixture) => (
                  <div key={fixture.id} className="rounded border p-3 sm:p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="break-words text-base font-medium sm:text-lg">
                          {fixture.homeTeam.name} vs {fixture.awayTeam.name}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {fixture.groupNumber ? `Group ${String.fromCharCode(64 + fixture.groupNumber)} · ` : ""}
                          {competition?.format === "KNOCKOUT" ? getRoundName(fixture.matchday ?? 1) : `Matchday ${fixture.matchday}`}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end sm:gap-0 sm:text-right">
                        <Badge variant="outline">{fixture.status}</Badge>
                        {fixture.matchDate && (
                          <div className="text-sm mt-2">
                            {new Date(fixture.matchDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      <Dialog open={nextRoundDialogOpen} onOpenChange={setNextRoundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Next Knockout Round</DialogTitle>
            <DialogDescription>
              Enter the qualified team IDs (comma-separated) from the previous round to advance to the next round.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Qualified Team IDs</label>
              <Input
                placeholder="team-id-1, team-id-2, team-id-3, team-id-4"
                value={qualifiedTeamIds.join(", ")}
                onChange={(e) => setQualifiedTeamIds(e.target.value.split(",").map(id => id.trim()).filter(Boolean))}
              />
            </div>
            <div className="text-sm text-gray-600">
              Available teams: {teams.map(t => `${t.name} (${t.id})`).join(", ")}
            </div>
            <div className="text-sm text-gray-600">
              Selected: {qualifiedTeamIds.length} teams (must be even number)
            </div>
            <Button
              onClick={handleGenerateNextRound}
              disabled={generatingNextRound || qualifiedTeamIds.length < 2 || qualifiedTeamIds.length % 2 !== 0}
              className="w-full"
            >
              {generatingNextRound ? "Generating..." : "Generate Next Round"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
