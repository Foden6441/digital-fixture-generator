"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Venue {
  id: string
  name: string
  location: string | null
  capacity: number | null
  homeTeam: { id: string; name: string } | null
}

interface VenueOption extends Venue {
  homeTeam: { id: string; name: string } | null
}

interface Team {
  id: string
  name: string
}

export default function VenuesPage() {
  const router = useRouter()
  const params = useParams()
  const [venues, setVenues] = useState<Venue[]>([])
  const [catalogueVenues, setCatalogueVenues] = useState<VenueOption[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    venueId: "new",
    name: "",
    location: "",
    capacity: "",
    homeTeamId: ""
  })

  useEffect(() => {
    const loadVenueData = async () => {
      try {
        const [venuesResponse, catalogueResponse, teamsResponse] = await Promise.all([
          fetch(`/api/competitions/${params.id}/venues`),
          fetch("/api/venues"),
          fetch(`/api/competitions/${params.id}/teams`)
        ])

        if (venuesResponse.ok) setVenues(await venuesResponse.json())
        if (catalogueResponse.ok) setCatalogueVenues(await catalogueResponse.json())
        if (teamsResponse.ok) setTeams(await teamsResponse.json())
      } catch (error) {
        console.error("Error loading venue data:", error)
      } finally {
        setLoading(false)
      }
    }

    void loadVenueData()
  }, [params.id])

  const fetchVenues = async () => {
    try {
      const response = await fetch(`/api/competitions/${params.id}/venues`)
      if (response.ok) {
        const data = await response.json()
        setVenues(data)
      }
    } catch (error) {
      console.error("Error fetching venues:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = await fetch(`/api/competitions/${params.id}/venues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData.venueId === "new"
          ? {
              name: formData.name,
              location: formData.location,
              capacity: formData.capacity ? parseInt(formData.capacity) : null,
              homeTeamId: formData.homeTeamId || null
            }
          : { venueId: formData.venueId })
      })

      if (response.ok) {
        setDialogOpen(false)
        setFormData({ venueId: "new", name: "", location: "", capacity: "", homeTeamId: "" })
        fetchVenues()
        fetch("/api/venues").then(async (catalogueResponse) => {
          if (catalogueResponse.ok) setCatalogueVenues(await catalogueResponse.json())
        })
      } else {
        alert("Failed to add venue")
      }
    } catch (error) {
      alert("An error occurred")
    }
  }

  const handleDelete = async (venueId: string) => {
    if (!confirm("Are you sure you want to delete this venue?")) return

    try {
      const response = await fetch(`/api/competitions/${params.id}/venues/${venueId}`, {
        method: "DELETE"
      })

      if (response.ok) {
        fetchVenues()
      } else {
        alert("Failed to delete venue")
      }
    } catch (error) {
      alert("An error occurred")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:py-4">
          <Button variant="ghost" onClick={() => router.back()}>
            ← Back
          </Button>
          <Button onClick={() => setDialogOpen(true)}>Add Venue</Button>
        </div>
      </header>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Venue</DialogTitle>
            <DialogDescription>Register a stadium or venue for this competition</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="venue-source">Venue</Label>
              <Select value={formData.venueId} onValueChange={(value) => setFormData({ ...formData, venueId: value ?? "new" })}>
                <SelectTrigger id="venue-source" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Create a new reusable venue</SelectItem>
                  {catalogueVenues.filter((venue) => !venues.some((member) => member.id === venue.id)).map((venue) => (
                    <SelectItem key={venue.id} value={venue.id}>
                      {venue.name}{venue.location ? ` (${venue.location})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formData.venueId === "new" && <>
            <div className="space-y-2">
              <Label htmlFor="name">Venue Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location (Optional)</Label>
              <Input
                id="location"
                placeholder="e.g., Dar es Salaam"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity (Optional)</Label>
              <Input
                id="capacity"
                type="number"
                placeholder="e.g., 60000"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="homeTeam">Home Team (Optional)</Label>
              <Select
                value={formData.homeTeamId || null}
                onValueChange={(value) => setFormData({ ...formData, homeTeamId: value ?? "" })}
              >
                <SelectTrigger id="homeTeam" className="w-full">
                  <SelectValue placeholder="Select the team that uses this venue" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            </>}
            <Button type="submit" className="w-full">Add Venue</Button>
          </form>
        </DialogContent>
      </Dialog>

      <main className="container mx-auto px-4 py-5 sm:py-8">
        <h1 className="mb-6 text-2xl font-bold sm:text-3xl">Manage Venues</h1>

        {loading ? (
          <p>Loading...</p>
        ) : venues.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 mb-4">No venues registered yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {venues.map((venue) => (
              <Card key={venue.id}>
                <CardHeader>
                  <CardTitle className="break-words">{venue.name}</CardTitle>
                  {venue.location && (
                    <CardDescription>{venue.location}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {venue.capacity && (
                    <p className="text-sm text-gray-600 mb-4">Capacity: {venue.capacity}</p>
                  )}
                  {venue.homeTeam && (
                    <div className="text-sm text-gray-600">Home team: {venue.homeTeam.name}</div>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(venue.id)}
                  >
                    Delete
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
