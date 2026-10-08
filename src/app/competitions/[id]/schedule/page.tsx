"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CalendarClock } from "lucide-react"

interface Fixture {
  id: string
  homeTeam: { id: string; name: string }
  awayTeam: { id: string; name: string }
  venue: { id: string; name: string } | null
  matchDate: string | null
  kickoffTime: string | null
  matchday: number
  groupNumber: number | null
  status: string
}

interface Venue {
  id: string
  name: string
}

interface Competition {
  format: string
}

export default function SchedulePage() {
  const router = useRouter()
  const params = useParams()
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [venues, setVenues] = useState<Venue[]>([])
  const [competition, setCompetition] = useState<Competition | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoScheduling, setAutoScheduling] = useState(false)
  const [scheduleError, setScheduleError] = useState("")
  const [scheduleNotice, setScheduleNotice] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null)
  const [formData, setFormData] = useState({
    matchDate: "",
    kickoffTime: "",
    venueId: ""
  })
  const [conflicts, setConflicts] = useState<string[]>([])

  useEffect(() => {
    const loadData = async () => {
      try {
        const [fixturesRes, venuesRes, competitionRes] = await Promise.all([
          fetch(`/api/competitions/${params.id}/fixtures`),
          fetch(`/api/competitions/${params.id}/venues`),
          fetch(`/api/competitions/${params.id}`)
        ])

        if (fixturesRes.ok) setFixtures(await fixturesRes.json())
        if (venuesRes.ok) setVenues(await venuesRes.json())
        if (competitionRes.ok) setCompetition(await competitionRes.json())
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
      const [fixturesRes, venuesRes, competitionRes] = await Promise.all([
        fetch(`/api/competitions/${params.id}/fixtures`),
        fetch(`/api/competitions/${params.id}/venues`),
        fetch(`/api/competitions/${params.id}`)
      ])

      if (fixturesRes.ok) setFixtures(await fixturesRes.json())
      if (venuesRes.ok) setVenues(await venuesRes.json())
      if (competitionRes.ok) setCompetition(await competitionRes.json())
    } catch (error) {
      console.error("Error fetching data:", error)
    }
  }

  const openDialog = (fixture: Fixture) => {
    setSelectedFixture(fixture)
    setFormData({
      matchDate: fixture.matchDate ? new Date(fixture.matchDate).toISOString().split('T')[0] : "",
      kickoffTime: fixture.kickoffTime || "",
      venueId: fixture.venue?.id || ""
    })
    setConflicts([])
    setDialogOpen(true)
  }

  const checkConflicts = async (fixtureId: string, matchDate: string, kickoffTime: string, venueId: string) => {
    if (!matchDate || !kickoffTime || !venueId) return

    try {
      const response = await fetch(`/api/competitions/${params.id}/fixtures/check-conflicts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fixtureId,
          matchDate,
          kickoffTime,
          venueId
        })
      })

      if (response.ok) {
        const data = await response.json()
        setConflicts(data.conflicts || [])
      }
    } catch (error) {
      console.error("Error checking conflicts:", error)
    }
  }

  const handleSave = async () => {
    if (!selectedFixture) return

    try {
      const response = await fetch(`/api/competitions/${params.id}/fixtures/${selectedFixture.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setDialogOpen(false)
        fetchData()
      } else {
        alert("Failed to update fixture")
      }
    } catch {
      alert("An error occurred")
    }
  }

  const handleAutoSchedule = async () => {
    if (!confirm("Automatically assign dates and kickoff times to every fixture? Existing schedules will be replaced.")) {
      return
    }

    setAutoScheduling(true)
    setScheduleError("")
    setScheduleNotice("")

    try {
      const response = await fetch(`/api/competitions/${params.id}/fixtures/auto-schedule`, {
        method: "POST"
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to automate the fixture schedule" }))
        setScheduleError(data.error || "Failed to automate the fixture schedule")
        return
      }

      const data = await response.json()
      const isKnockout = competition?.format === "KNOCKOUT"
      setScheduleNotice(`Scheduled ${data.fixtureCount} fixtures across the competition ${isKnockout ? "days" : "weekends"}.`)
      await fetchData()
    } catch (error) {
      console.error("Error automating fixture schedule:", error)
      setScheduleError("An error occurred while automating the fixture schedule")
    } finally {
      setAutoScheduling(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-50 p-4 sm:p-8">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:py-4">
          <Button variant="ghost" className="shrink-0" onClick={() => router.back()}>
            ← Back
          </Button>
          <h1 className="order-first w-full text-lg font-bold sm:order-none sm:w-auto sm:text-xl">Schedule Fixtures</h1>
          {fixtures.length > 0 && (
            <Button className="ml-auto min-w-0" onClick={handleAutoSchedule} disabled={autoScheduling}>
              <CalendarClock aria-hidden="true" />
              {autoScheduling ? "Scheduling..." : "Auto Schedule"}
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-5 sm:py-8">
        <div className="mb-6">
          <p className="text-gray-600">
            Assign dates, times, and venues to fixtures. Click on a fixture to schedule it.
          </p>
        </div>

        {scheduleError && (
          <Alert className="mb-6" variant="destructive">
            <AlertDescription>{scheduleError}</AlertDescription>
          </Alert>
        )}
        {scheduleNotice && (
          <Alert className="mb-6">
            <AlertDescription>{scheduleNotice}</AlertDescription>
          </Alert>
        )}

        {fixtures.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 mb-4">No fixtures to schedule</p>
              <Button onClick={() => router.push(`/competitions/${params.id}/fixtures`)}>
                Generate Fixtures First
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {fixtures.map((fixture) => (
              <Card key={fixture.id} className="cursor-pointer transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" onClick={() => openDialog(fixture)}>
                    <div className="min-w-0 flex-1">
                      <div className="break-words text-base font-medium sm:text-lg">
                        {fixture.homeTeam.name} vs {fixture.awayTeam.name}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {fixture.groupNumber ? `Group ${String.fromCharCode(64 + fixture.groupNumber)} · ` : ""}Matchday {fixture.matchday}
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      {fixture.matchDate && fixture.kickoffTime ? (
                        <div>
                          <div className="font-medium">
                            {new Date(fixture.matchDate).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-gray-600">{fixture.kickoffTime}</div>
                          {fixture.venue && (
                            <div className="text-sm text-gray-600">{fixture.venue.name}</div>
                          )}
                        </div>
                      ) : (
                        <div className="text-gray-400">Not scheduled</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Fixture</DialogTitle>
            <DialogDescription>
              {selectedFixture && (
                <>{selectedFixture.homeTeam.name} vs {selectedFixture.awayTeam.name}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="matchDate">Match Date</Label>
              <Input
                id="matchDate"
                type="date"
                value={formData.matchDate}
                onChange={(e) => {
                  setFormData({ ...formData, matchDate: e.target.value })
                  if (formData.kickoffTime && formData.venueId) {
                    checkConflicts(selectedFixture?.id || "", e.target.value, formData.kickoffTime, formData.venueId)
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kickoffTime">Kickoff Time</Label>
              <Input
                id="kickoffTime"
                type="time"
                value={formData.kickoffTime}
                onChange={(e) => {
                  setFormData({ ...formData, kickoffTime: e.target.value })
                  if (formData.matchDate && formData.venueId) {
                    checkConflicts(selectedFixture?.id || "", formData.matchDate, e.target.value, formData.venueId)
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="venue">Venue</Label>
              <Select
                value={formData.venueId}
                onValueChange={(value) => {
                  const venueId = value ?? ""
                  setFormData({ ...formData, venueId })
                  if (formData.matchDate && formData.kickoffTime) {
                    checkConflicts(selectedFixture?.id || "", formData.matchDate, formData.kickoffTime, venueId)
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a venue" />
                </SelectTrigger>
                <SelectContent>
                  {venues.map((venue) => (
                    <SelectItem key={venue.id} value={venue.id}>
                      {venue.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {conflicts.length > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  <div className="font-medium mb-2">Scheduling Conflicts:</div>
                  <ul className="list-disc list-inside text-sm">
                    {conflicts.map((conflict, index) => (
                      <li key={index}>{conflict}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1" disabled={conflicts.length > 0}>
                Save Schedule
              </Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
