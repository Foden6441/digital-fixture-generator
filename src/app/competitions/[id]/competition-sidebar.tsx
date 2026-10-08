"use client"

import Link from "next/link"
import { useParams, usePathname } from "next/navigation"
import {
  CalendarDays,
  CalendarRange,
  ClipboardList,
  History,
  LayoutDashboard,
  MapPin,
  UsersRound
} from "lucide-react"
import { cn } from "@/lib/utils"

interface CompetitionSidebarProps {
  competition: {
    id: string
    name: string
    season: string
    teamCount: number
    venueCount: number
    fixtureCount: number
  }
}

const navItems = [
  { label: "Overview", href: "", icon: LayoutDashboard },
  { label: "Teams", href: "/teams", icon: UsersRound, countKey: "teamCount" },
  { label: "Venues", href: "/venues", icon: MapPin, countKey: "venueCount" },
  { label: "Fixtures", href: "/fixtures", icon: ClipboardList, countKey: "fixtureCount" },
  { label: "Schedule", href: "/schedule", icon: CalendarDays },
  { label: "Postpone matches", href: "/postpone", icon: CalendarRange },
  { label: "Audit history", href: "/audit", icon: History }
] as const

export default function CompetitionSidebar({ competition }: CompetitionSidebarProps) {
  const pathname = usePathname()
  const params = useParams<{ id: string }>()
  const basePath = `/competitions/${params.id}`

  return (
    <aside className="border-b bg-white lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r">
      <div className="border-b px-5 py-5">
        <Link href="/dashboard" className="text-xs font-medium text-muted-foreground hover:text-foreground">
          Digital Fixture Generator
        </Link>
        <h2 className="mt-3 truncate text-base font-semibold" title={competition.name}>
          {competition.name}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{competition.season}</p>
      </div>
      <nav aria-label="Competition navigation" className="flex gap-1 overflow-x-auto p-3 lg:flex-col lg:overflow-visible">
        {navItems.map((item) => {
          const href = `${basePath}${item.href}`
          const isActive = item.href === ""
            ? pathname === basePath
            : pathname === href || pathname.startsWith(`${href}/`)
          const count = "countKey" in item ? competition[item.countKey] : null
          const Icon = item.icon

          return (
            <Link
              key={item.label}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-10 shrink-0 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              <span className="whitespace-nowrap">{item.label}</span>
              {count !== null && (
                <span className={cn("ml-auto text-xs", isActive ? "text-primary-foreground/75" : "text-muted-foreground")}>
                  {count}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
