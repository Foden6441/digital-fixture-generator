"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface Venue {
  id: string
  name: string
  location: string | null
  capacity: number | null
}

export default function VenuesPage() {
  const router = useRouter()
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    capacity: ""
  })

  useEffect(() => {
    fetchVenues()
  }, [])

  const fetchVenues = async () => {
    try {
      const response = await fetch("/api/venues")
      if (response.ok) {
        const data = await response.json()
        setVenues(data)
      }
    } catch (error) {
      console.error("Error fetching venues:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = await fetch("/api/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          capacity: formData.capacity ? parseInt(formData.capacity) : null
        })
      })

      if (response.ok) {
        setDialogOpen(false)
        setFormData({ name: "", location: "", capacity: "" })
        fetchVenues()
      } else {
        alert("Failed to add venue")
      }
    } catch (error) {
      alert("An error occurred")
    }
  }

  const handleDelete = async (venueId: string) => {
    if (!confirm("Are you sure you want to delete this venue? This will remove it from all competitions.")) return

    try {
      const response = await fetch(`/api/venues/${venueId}`, {
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
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Button variant="ghost" onClick={() => router.back()}>
            ← Back to Dashboard
          </Button>
          <Button onClick={() => setDialogOpen(true)}>Add New Venue</Button>
        </div>
      </header>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Venue</DialogTitle>
            <DialogDescription>This venue can be used in multiple competitions</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
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
            <Button type="submit" className="w-full">Create Venue</Button>
          </form>
        </DialogContent>
      </Dialog>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Venue Management</h1>
        <p className="text-gray-600 mb-6">
          Create and manage venues that can be used across multiple competitions.
        </p>

        {loading ? (
          <p>Loading...</p>
        ) : venues.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 mb-4">No venues created yet</p>
              <Button onClick={() => setDialogOpen(true)}>Create Your First Venue</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {venues.map((venue) => (
              <Card key={venue.id}>
                <CardHeader>
                  <CardTitle>{venue.name}</CardTitle>
                  {venue.location && (
                    <CardDescription>{venue.location}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {venue.capacity && (
                    <p className="text-sm text-gray-600 mb-4">Capacity: {venue.capacity}</p>
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
