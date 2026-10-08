"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface Team {
  id: string
  name: string
  abbreviation: string | null
  logo: string | null
}

export default function TeamsPage() {
  const router = useRouter()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    abbreviation: ""
  })

  useEffect(() => {
    fetchTeams()
  }, [])

  const fetchTeams = async () => {
    try {
      const response = await fetch("/api/teams")
      if (response.ok) {
        const data = await response.json()
        setTeams(data)
      }
    } catch (error) {
      console.error("Error fetching teams:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setDialogOpen(false)
        setFormData({ name: "", abbreviation: "" })
        fetchTeams()
      } else {
        alert("Failed to add team")
      }
    } catch (error) {
      alert("An error occurred")
    }
  }

  const handleDelete = async (teamId: string) => {
    if (!confirm("Are you sure you want to delete this team? This will remove it from all competitions.")) return

    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        method: "DELETE"
      })

      if (response.ok) {
        fetchTeams()
      } else {
        alert("Failed to delete team")
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
          <Button onClick={() => setDialogOpen(true)}>Add New Team</Button>
        </div>
      </header>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
            <DialogDescription>This team can be used in multiple competitions</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Team Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="abbreviation">Abbreviation (Optional)</Label>
              <Input
                id="abbreviation"
                placeholder="e.g., YSC"
                value={formData.abbreviation}
                onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value })}
              />
            </div>
            <Button type="submit" className="w-full">Create Team</Button>
          </form>
        </DialogContent>
      </Dialog>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Team Management</h1>
        <p className="text-gray-600 mb-6">
          Create and manage teams that can be used across multiple competitions.
        </p>

        {loading ? (
          <p>Loading...</p>
        ) : teams.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 mb-4">No teams created yet</p>
              <Button onClick={() => setDialogOpen(true)}>Create Your First Team</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <Card key={team.id}>
                <CardHeader>
                  <CardTitle>{team.name}</CardTitle>
                  {team.abbreviation && (
                    <CardDescription>{team.abbreviation}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(team.id)}
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
