"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"

interface Fixture {
  id: string
  homeTeam: { id: string; name: string }
  awayTeam: { id: string; name: string }
  venue: { id: string; name: string } | null
  matchDate: string | null
  kickoffTime: string | null
  matchday: number
  status: string
  notes: string | null
}

export default function PostponePage() {
  const router = useRouter()
  const params = useParams()
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null)
  const [formData, setFormData] = useState({
    newMatchDate: "",
    newKickoffTime: "",
    reason: ""
  })

  useEffect(() => {
    const loadFixtures = async () => {
      try {
        const response = await fetch(`/api/competitions/${params.id}/fixtures`)
        if (response.ok) setFixtures(await response.json())
      } catch (error) {
        console.error("Error fetching fixtures:", error)
      } finally {
        setLoading(false)
      }
    }

    void loadFixtures()
  }, [params.id])

  const fetchFixtures = async () => {
    try {
      const response = await fetch(`/api/competitions/${params.id}/fixtures`)
      if (response.ok) {
        const data = await response.json()
        setFixtures(data.filter((f: Fixture) => f.status === "SCHEDULED"))
      }
    } catch (error) {
      console.error("Error fetching fixtures:", error)
    }
  }

  const openDialog = (fixture: Fixture) => {
    setSelectedFixture(fixture)
    setFormData({
      newMatchDate: fixture.matchDate ? new Date(fixture.matchDate).toISOString().split('T')[0] : "",
      newKickoffTime: fixture.kickoffTime || "",
      reason: ""
    })
    setDialogOpen(true)
  }

  const handlePostpone = async () => {
    if (!selectedFixture) return

    try {
      // First, mark as postponed
      await fetch(`/api/competitions/${params.id}/fixtures/${selectedFixture.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "POSTPONED",
          notes: formData.reason || "Postponed - to be rescheduled"
        })
      })

      // If new date is provided, create a rescheduled fixture
      if (formData.newMatchDate && formData.newKickoffTime) {
        await fetch(`/api/competitions/${params.id}/fixtures/${selectedFixture.id}/reschedule`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matchDate: formData.newMatchDate,
            kickoffTime: formData.newKickoffTime
          })
        })
      }

      setDialogOpen(false)
      fetchFixtures()
    } catch (error) {
      alert("An error occurred")
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-50 p-4 sm:p-8">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:py-4">
          <Button variant="ghost" onClick={() => router.back()}>
            ← Back
          </Button>
          <h1 className="text-xl font-bold">Postpone Matches</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-5 sm:py-8">
        <div className="mb-6">
          <p className="text-gray-600">
            Select scheduled matches to postpone. You can optionally set a new date for rescheduling.
          </p>
        </div>

        {fixtures.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">No scheduled fixtures to postpone</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {fixtures.map((fixture) => (
              <Card key={fixture.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="break-words text-base font-medium sm:text-lg">
                        {fixture.homeTeam.name} vs {fixture.awayTeam.name}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Matchday {fixture.matchday}
                      </div>
                      {fixture.matchDate && fixture.kickoffTime && (
                        <div className="text-sm text-gray-600 mt-1">
                          {new Date(fixture.matchDate).toLocaleDateString()} at {fixture.kickoffTime}
                        </div>
                      )}
                      {fixture.venue && (
                        <div className="text-sm text-gray-600">{fixture.venue.name}</div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{fixture.status}</Badge>
                      <Dialog open={dialogOpen && selectedFixture?.id === fixture.id} onOpenChange={(open) => {
                        if (!open) setSelectedFixture(null)
                        setDialogOpen(open)
                      }}>
                        <DialogTrigger
                          render={
                            <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDialog(fixture)}
                            >
                              Postpone
                            </Button>
                          }
                        />
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Postpone Match</DialogTitle>
                            <DialogDescription>
                              {selectedFixture && (
                                <>{selectedFixture.homeTeam.name} vs {selectedFixture.awayTeam.name}</>
                              )}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="reason">Reason for Postponement</Label>
                              <Textarea
                                id="reason"
                                placeholder="e.g., Weather conditions, stadium unavailability"
                                value={formData.reason}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="newMatchDate">New Match Date (Optional)</Label>
                              <Input
                                id="newMatchDate"
                                type="date"
                                value={formData.newMatchDate}
                                onChange={(e) => setFormData({ ...formData, newMatchDate: e.target.value })}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="newKickoffTime">New Kickoff Time (Optional)</Label>
                              <Input
                                id="newKickoffTime"
                                type="time"
                                value={formData.newKickoffTime}
                                onChange={(e) => setFormData({ ...formData, newKickoffTime: e.target.value })}
                              />
                            </div>

                            <div className="flex gap-2">
                              <Button onClick={handlePostpone} className="flex-1">
                                Postpone Match
                              </Button>
                              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
