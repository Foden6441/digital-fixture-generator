"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { exportFixturesToPDF, exportFixturesToCSV, exportFixturesToExcel } from "@/lib/exportFixtures"

interface Fixture {
  matchday: number | null
  groupNumber?: number | null
  homeTeam: { name: string }
  awayTeam: { name: string }
  venue: { name: string } | null
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

interface FixtureExportProps {
  competition: Competition
  fixtures: Fixture[]
}

export default function FixtureExport({ competition, fixtures }: FixtureExportProps) {
  const handleExportPDF = () => {
    exportFixturesToPDF(competition, fixtures)
  }

  const handleExportCSV = () => {
    exportFixturesToCSV(competition, fixtures)
  }

  const handleExportExcel = () => {
    exportFixturesToExcel(competition, fixtures)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
        Export
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={handleExportPDF}>
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportCSV}>
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportExcel}>
          Export as Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
