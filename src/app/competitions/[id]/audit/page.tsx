"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface AuditLog {
  id: string
  entityType: string
  entityId: string
  action: string
  changes: string | null
  createdAt: string
  user: {
    name: string | null
    email: string
  }
}

export default function AuditLogPage() {
  const router = useRouter()
  const params = useParams()
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadAuditLogs = async () => {
      try {
        const response = await fetch(`/api/competitions/${params.id}/audit`)
        if (response.ok) setAuditLogs(await response.json())
      } catch (error) {
        console.error("Error fetching audit logs:", error)
      } finally {
        setLoading(false)
      }
    }

    void loadAuditLogs()
  }, [params.id])

  const formatChanges = (changes: string | null) => {
    if (!changes) return "N/A"
    try {
      const parsed = JSON.parse(changes)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return changes
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
          <h1 className="text-xl font-bold">Audit History</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-5 sm:py-8">
        <div className="mb-6">
          <p className="text-gray-600">
            Track all changes made to this competition, including fixture generation, scheduling, and modifications.
          </p>
        </div>

        {auditLogs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">No audit history available</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Audit Log</CardTitle>
              <CardDescription>Chronological record of all changes</CardDescription>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="w-full overflow-x-auto">
              <Table className="min-w-[680px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Changes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{log.user.name || "Unknown"}</div>
                          <div className="text-sm text-gray-600">{log.user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.entityType}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge>{log.action}</Badge>
                      </TableCell>
                      <TableCell>
                        <details className="cursor-pointer">
                          <summary className="text-sm text-blue-600 hover:text-blue-800">
                            View details
                          </summary>
                          <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                            {formatChanges(log.changes)}
                          </pre>
                        </details>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
