"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Team {
  id: string
  name: string
  abbreviation: string | null
}

interface TeamOption extends Team {
  abbreviation: string | null
}

export default function TeamsPage() {
  const router = useRouter()
  const params = useParams()
  const [teams, setTeams] = useState<Team[]>([])
  const [catalogueTeams, setCatalogueTeams] = useState<TeamOption[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    teamId: "new",
    name: "",
    abbreviation: ""
  })

  useEffect(() => {
    const loadTeams = async () => {
      try {
        const [response, catalogueResponse] = await Promise.all([
          fetch(`/api/competitions/${params.id}/teams`),
          fetch("/api/teams")
        ])
        if (response.ok) setTeams(await response.json())
        if (catalogueResponse.ok) setCatalogueTeams(await catalogueResponse.json())
      } catch (error) {
        console.error("Error fetching teams:", error)
      } finally {
        setLoading(false)
      }
    }

    void loadTeams()
  }, [params.id])

  const fetchTeams = async () => {
    try {
      const response = await fetch(`/api/competitions/${params.id}/teams`)
      if (response.ok) {
        const data = await response.json()
        setTeams(data)
      }
    } catch (error) {
      console.error("Error fetching teams:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = await fetch(`/api/competitions/${params.id}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData.teamId === "new"
          ? { name: formData.name, abbreviation: formData.abbreviation }
          : { teamId: formData.teamId })
      })

      if (response.ok) {
        setDialogOpen(false)
        setFormData({ teamId: "new", name: "", abbreviation: "" })
        fetchTeams()
        fetch("/api/teams").then(async (catalogueResponse) => {
          if (catalogueResponse.ok) setCatalogueTeams(await catalogueResponse.json())
        })
      } else {
        alert("Failed to add team")
      }
    } catch (error) {
      alert("An error occurred")
    }
  }

  const handleDelete = async (teamId: string) => {
    if (!confirm("Are you sure you want to delete this team?")) return

    try {
      const response = await fetch(`/api/competitions/${params.id}/teams/${teamId}`, {
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
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:py-4">
          <Button variant="ghost" onClick={() => router.back()}>
            ← Back
          </Button>
          <Button onClick={() => setDialogOpen(true)}>Add Team</Button>
        </div>
      </header>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Team</DialogTitle>
            <DialogDescription>Register a team for this competition</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="team-source">Team</Label>
              <Select value={formData.teamId} onValueChange={(value) => setFormData({ ...formData, teamId: value ?? "new" })}>
                <SelectTrigger id="team-source" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Create a new reusable team</SelectItem>
                  {catalogueTeams.filter((team) => !teams.some((member) => member.id === team.id)).map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}{team.abbreviation ? ` (${team.abbreviation})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formData.teamId === "new" && <>
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
            </>}
            <Button type="submit" className="w-full">Add Team</Button>
          </form>
        </DialogContent>
      </Dialog>

      <main className="container mx-auto px-4 py-5 sm:py-8">
        <h1 className="mb-6 text-2xl font-bold sm:text-3xl">Manage Teams</h1>

        {loading ? (
          <p>Loading...</p>
        ) : teams.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 mb-4">No teams registered yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <Card key={team.id}>
                <CardHeader>
                  <CardTitle className="break-words">{team.name}</CardTitle>
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
