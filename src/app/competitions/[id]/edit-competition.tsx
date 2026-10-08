"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface CompetitionEditProps {
  id: string
  name: string
  description: string | null
  logo: string | null
  primaryColor: string
  groupSize: number
  season: string
  startDate: string
  endDate: string
  format: string
}

export default function EditCompetition({ competition }: { competition: CompetitionEditProps }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [logo, setLogo] = useState<string | null>(competition.logo)
  const [formData, setFormData] = useState({
    name: competition.name,
    description: competition.description ?? "",
    season: competition.season,
    startDate: new Date(competition.startDate).toISOString().slice(0, 10),
    endDate: new Date(competition.endDate).toISOString().slice(0, 10),
    format: competition.format,
    groupSize: competition.groupSize,
    primaryColor: competition.primaryColor
  })

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setError("")
    if (!file) return

    if (!/^image\/(png|jpeg)$/.test(file.type)) {
      setError("Choose a PNG or JPEG image.")
      event.target.value = ""
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Logo file must be smaller than 2 MB.")
      event.target.value = ""
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") setLogo(reader.result)
    }
    reader.onerror = () => setError("Could not read the selected logo.")
    reader.readAsDataURL(file)
  }

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setSaving(true)

    try {
      const response = await fetch(`/api/competitions/${competition.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, logo })
      })
      const result = await response.json()

      if (!response.ok) {
        setError(result.error || "Could not update competition.")
        return
      }

      setOpen(false)
      router.refresh()
    } catch {
      setError("An error occurred while updating the competition.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" onClick={() => setOpen(true)}>Edit Competition</Button>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit Competition</DialogTitle>
          <DialogDescription>Update competition details and its PDF logo.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Competition Name</Label>
            <Input id="edit-name" value={formData.name} required onChange={(event) => setFormData({ ...formData, name: event.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Input id="edit-description" value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-season">Season</Label>
            <Input id="edit-season" value={formData.season} required onChange={(event) => setFormData({ ...formData, season: event.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-start-date">Start Date</Label>
              <Input id="edit-start-date" type="date" value={formData.startDate} required onChange={(event) => setFormData({ ...formData, startDate: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-end-date">End Date</Label>
              <Input id="edit-end-date" type="date" value={formData.endDate} required onChange={(event) => setFormData({ ...formData, endDate: event.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-format">Format</Label>
            <Select value={formData.format} onValueChange={(value) => setFormData({ ...formData, format: value ?? formData.format })}>
              <SelectTrigger id="edit-format" className="w-full"><SelectValue /></SelectTrigger>
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
              <Label htmlFor="edit-group-size">Teams per Group</Label>
              <Select value={String(formData.groupSize)} onValueChange={(value) => setFormData({ ...formData, groupSize: Number(value ?? 4) })}>
                <SelectTrigger id="edit-group-size" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[3, 4, 5, 6].map((size) => (
                    <SelectItem key={size} value={String(size)}>{size} teams per group</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">Teams are balanced across groups; odd groups receive a bye each matchweek.</p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="edit-primary-color">Competition Color</Label>
            <div className="flex items-center gap-3">
              <Input
                id="edit-primary-color"
                type="color"
                value={formData.primaryColor}
                className="h-10 w-16 cursor-pointer p-1"
                onChange={(event) => setFormData({ ...formData, primaryColor: event.target.value })}
              />
              <span className="font-mono text-sm uppercase text-muted-foreground">{formData.primaryColor}</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-logo">Competition Logo</Label>
            <Input id="edit-logo" type="file" accept="image/png,image/jpeg" onChange={handleLogoChange} />
            {logo && (
              <div className="flex items-center gap-3">
                <Image
                  src={logo}
                  alt="Competition logo preview"
                  width={80}
                  height={80}
                  unoptimized
                  onError={() => setError("The saved logo is incomplete. Upload the original PNG or JPEG again.")}
                  className="size-16 rounded border object-contain"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => setLogo(null)}>Remove Logo</Button>
              </div>
            )}
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
