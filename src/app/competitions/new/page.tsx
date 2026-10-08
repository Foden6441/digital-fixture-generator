"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface TeamOption {
  id: string
  name: string
  abbreviation: string | null
}

export default function NewCompetitionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [logo, setLogo] = useState<string | null>(null)
  const [logoError, setLogoError] = useState("")
  const [catalogueTeams, setCatalogueTeams] = useState<TeamOption[]>([])
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])
  const [teamSearch, setTeamSearch] = useState("")
  const [newTeamName, setNewTeamName] = useState("")
  const [newTeamAbbreviation, setNewTeamAbbreviation] = useState("")
  const [newTeams, setNewTeams] = useState<Array<{ name: string; abbreviation: string }>>([])
  const [teamError, setTeamError] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    season: "",
    startDate: "",
    endDate: "",
    format: "DOUBLE_ROUND_ROBIN",
    groupSize: 4,
    primaryColor: "#191B52"
  })

  useEffect(() => {
    const loadTeams = async () => {
      try {
        const response = await fetch("/api/teams")
        if (response.ok) setCatalogueTeams(await response.json())
      } catch (error) {
        console.error("Could not load reusable teams:", error)
      }
    }

    void loadTeams()
  }, [])

  const addNewTeam = () => {
    const name = newTeamName.trim()
    if (!name) {
      setTeamError("Enter a team name before adding it.")
      return
    }
    if (newTeams.some((team) => team.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      setTeamError("That team is already in the new-team list.")
      return
    }

    setTeamError("")
    setNewTeams([...newTeams, { name, abbreviation: newTeamAbbreviation.trim() }])
    setNewTeamName("")
    setNewTeamAbbreviation("")
  }

  const toggleTeam = (teamId: string) => {
    setSelectedTeamIds((current) => current.includes(teamId)
      ? current.filter((id) => id !== teamId)
      : [...current, teamId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLogoError("")
    setLoading(true)

    try {
      const response = await fetch("/api/competitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          logo,
          existingTeamIds: selectedTeamIds,
          newTeams
        })
      })

      if (response.ok) {
        const competition = await response.json()
        router.push(`/competitions/${competition.id}`)
      } else {
        alert("Failed to create competition")
      }
    } catch (error) {
      alert("An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => router.back()}>
            ← Back
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Create New Competition</CardTitle>
            <CardDescription>Set up a new football competition</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Competition Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="primaryColor">Competition Color</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={formData.primaryColor}
                    className="h-10 w-16 cursor-pointer p-1"
                    onChange={(event) => setFormData({ ...formData, primaryColor: event.target.value })}
                  />
                  <span className="font-mono text-sm uppercase text-muted-foreground">{formData.primaryColor}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo">Competition Logo (Optional)</Label>
                <Input
                  id="logo"
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    setLogoError("")
                    setLogo(null)

                    if (!file) return
                    if (!file.type.match(/^image\/(png|jpeg)$/)) {
                      setLogoError("Choose a PNG or JPEG image.")
                      event.target.value = ""
                      return
                    }
                    if (file.size > 2 * 1024 * 1024) {
                      setLogoError("Logo file must be smaller than 2 MB.")
                      event.target.value = ""
                      return
                    }

                    const reader = new FileReader()
                    reader.onload = () => {
                      if (typeof reader.result === "string") setLogo(reader.result)
                    }
                    reader.onerror = () => setLogoError("Could not read the selected logo.")
                    reader.readAsDataURL(file)
                  }}
                />
                {logo && (
                  <Image
                    src={logo}
                    alt="Competition logo preview"
                    width={160}
                    height={64}
                    unoptimized
                    className="h-16 max-w-40 object-contain"
                  />
                )}
                {logoError && <p className="text-sm text-destructive">{logoError}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="season">Season</Label>
                <Input
                  id="season"
                  placeholder="e.g., 2024/2025"
                  value={formData.season}
                  onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="format">Format</Label>
                <Select
                  value={formData.format}
                  onValueChange={(value) => setFormData({ ...formData, format: value ?? "DOUBLE_ROUND_ROBIN" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SINGLE_ROUND_ROBIN">Single Round-Robin</SelectItem>
                    <SelectItem value="DOUBLE_ROUND_ROBIN">Double Round-Robin</SelectItem>
                    <SelectItem value="GROUP_STAGE">Group Stage</SelectItem>
                    <SelectItem value="KNOCKOUT">Knockout</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.format === "GROUP_STAGE" && (
                <div className="space-y-2">
                  <Label htmlFor="groupSize">Teams per Group</Label>
                  <Select
                    value={String(formData.groupSize)}
                    onValueChange={(value) => setFormData({ ...formData, groupSize: Number(value ?? 4) })}
                  >
                    <SelectTrigger id="groupSize" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[3, 4, 5, 6].map((size) => (
                        <SelectItem key={size} value={String(size)}>{size} teams per group</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">Teams will be balanced across groups; smaller groups may have a bye each matchweek.</p>
                </div>
              )}

              <section className="space-y-4 rounded-md border p-4" aria-labelledby="teams-heading">
                <div>
                  <h3 id="teams-heading" className="text-sm font-semibold">Competition Teams</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Select teams from your catalogue, or add new teams to reuse in future competitions.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="team-search">Find Existing Teams</Label>
                  <Input
                    id="team-search"
                    placeholder="Search team name or abbreviation"
                    value={teamSearch}
                    onChange={(event) => setTeamSearch(event.target.value)}
                  />
                  <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
                    {catalogueTeams.filter((team) => {
                      const query = teamSearch.trim().toLocaleLowerCase()
                      return !query || `${team.name} ${team.abbreviation ?? ""}`.toLocaleLowerCase().includes(query)
                    }).map((team) => (
                      <label key={team.id} className="flex cursor-pointer items-center gap-3 rounded px-2 py-2 hover:bg-muted">
                        <input
                          type="checkbox"
                          checked={selectedTeamIds.includes(team.id)}
                          onChange={() => toggleTeam(team.id)}
                          className="size-4 accent-primary"
                        />
                        <span className="min-w-0 flex-1 break-words text-sm">{team.name}</span>
                        {team.abbreviation && <span className="text-xs text-muted-foreground">{team.abbreviation}</span>}
                      </label>
                    ))}
                    {catalogueTeams.length === 0 && <p className="p-2 text-sm text-muted-foreground">No saved teams yet. Add the first one below.</p>}
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem_auto] sm:items-end">
                  <div className="space-y-2">
                    <Label htmlFor="new-team-name">New Team Name</Label>
                    <Input id="new-team-name" value={newTeamName} onChange={(event) => setNewTeamName(event.target.value)} placeholder="e.g., Lakeside FC" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-team-abbreviation">Abbreviation</Label>
                    <Input id="new-team-abbreviation" value={newTeamAbbreviation} onChange={(event) => setNewTeamAbbreviation(event.target.value)} placeholder="Optional" />
                  </div>
                  <Button type="button" variant="outline" onClick={addNewTeam}>Add Team</Button>
                </div>

                {(selectedTeamIds.length > 0 || newTeams.length > 0) && (
                  <p className="text-sm font-medium">{selectedTeamIds.length + newTeams.length} teams selected</p>
                )}
                {newTeams.length > 0 && (
                  <ul className="space-y-1 text-sm">
                    {newTeams.map((team, index) => (
                      <li key={`${team.name}-${index}`} className="flex items-center justify-between gap-3 rounded bg-muted px-3 py-2">
                        <span className="min-w-0 break-words">{team.name}{team.abbreviation ? ` (${team.abbreviation})` : ""}</span>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setNewTeams(newTeams.filter((_, itemIndex) => itemIndex !== index))}>Remove</Button>
                      </li>
                    ))}
                  </ul>
                )}
                {teamError && <p role="alert" className="text-sm text-destructive">{teamError}</p>}
              </section>

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.push("/dashboard")}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? "Creating..." : "Create Competition"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
