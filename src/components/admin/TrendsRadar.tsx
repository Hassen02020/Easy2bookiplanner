"use client"

/**
 * TrendsRadar.tsx
 *
 * Radar des tendances de marché pour le manager Easy2Book.
 * Affiche les destinations explosives, la part du tourisme alternatif,
 * et le nuage de mots-clés émergents des demandes clients tunisiens.
 */

import { useEffect, useState } from "react"
import { TrendingUp, MapPin, Sparkles, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

interface TrendAnalytics {
  periodDays: number
  totalAnalyzed: number
  topDestinations: Array<{ destination: string; count: number }>
  alternativeShare: number
  categoryBreakdown: Array<{ category: string | null; count: number }>
  emergingKeywords: Array<{ keyword: string; count: number }>
}

interface TrendsRadarProps {
  className?: string
}

export function TrendsRadar({ className }: TrendsRadarProps) {
  const [data, setData] = useState<TrendAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTrends() {
      try {
        const response = await fetch("/api/admin/trends-analytics")
        if (!response.ok) {
          throw new Error("Failed to fetch trends")
        }
        const json = await response.json()
        setData(json)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue")
      } finally {
        setLoading(false)
      }
    }

    fetchTrends()
  }, [])

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-48" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className={cn("rounded-lg border border-red-200 bg-red-50 p-4 text-red-700", className)}>
        <p className="font-medium">Impossible de charger les tendances.</p>
        <p className="text-sm">{error || "Aucune donnée disponible."}</p>
      </div>
    )
  }

  const topDestination = data.topDestinations[0]

  return (
    <div className={cn("space-y-5", className)}>
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Radar des tendances</h2>
        <span className="text-xs text-muted-foreground">({data.periodDays} derniers jours)</span>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Destination explosive
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-bold leading-tight">
                  {topDestination?.destination || "N/A"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {topDestination?.count || 0} demandes
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Part tourisme alternatif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-bold leading-tight">{data.alternativeShare}%</div>
                <div className="text-xs text-muted-foreground">vs classique</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Demandes analysées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-bold leading-tight">{data.totalAnalyzed}</div>
                <div className="text-xs text-muted-foreground">conversations</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top destinations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Top destinations demandées</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.topDestinations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune destination dominante cette semaine.</p>
            ) : (
              data.topDestinations.map((item, index) => (
                <div key={item.destination} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.destination}</span>
                      <span className="text-muted-foreground">{item.count}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${topDestination ? (item.count / topDestination.count) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Emerging keywords */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Nuage de mots-clés émergents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {data.emergingKeywords.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun signal faible détecté.</p>
            ) : (
              data.emergingKeywords.map((item) => (
                <Badge
                  key={item.keyword}
                  variant="secondary"
                  className={cn(
                    "text-xs",
                    item.count >= 3 ? "bg-primary/15 text-primary hover:bg-primary/20" : ""
                  )}
                >
                  {item.keyword}
                  <span className="ml-1.5 text-[10px] opacity-70">×{item.count}</span>
                </Badge>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
