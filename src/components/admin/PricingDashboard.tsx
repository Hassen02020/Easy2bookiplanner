"use client"

/**
 * PricingDashboard.tsx
 *
 * Tableau de bord de gestion des règles de tarification Easy2Book.
 * - Statistiques rapides (règles actives, destinations populaires, types de règles).
 * - Tableau des règles avec actions rapides (activer/désactiver, éditer la valeur).
 * - Design responsive, épuré, style shadcn/ui, Tailwind CSS v4.
 */

import { useState, useMemo } from "react"
import { Pencil, Power, PowerOff, TrendingUp, MapPin, Tag, Activity } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"

export type PricingRuleType = "markup_percentage" | "discount_fixed" | "override"

export interface PricingRuleRow {
  id: string
  category: string
  destination: string | null
  ruleType: PricingRuleType
  value: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface PricingDashboardProps {
  initialRules?: PricingRuleRow[]
}

const RULE_TYPE_LABELS: Record<PricingRuleType, string> = {
  markup_percentage: "Majoration %",
  discount_fixed: "Remise fixe",
  override: "Prix forcé",
}

const RULE_TYPE_COLORS: Record<PricingRuleType, "default" | "secondary" | "destructive" | "outline" | "success"> = {
  markup_percentage: "default",
  discount_fixed: "secondary",
  override: "destructive",
}

const MOCK_RULES: PricingRuleRow[] = [
  {
    id: "1",
    category: "hotel",
    destination: "Hammamet",
    ruleType: "markup_percentage",
    value: 15,
    isActive: true,
    createdAt: "2026-01-15T10:00:00Z",
    updatedAt: "2026-06-20T14:30:00Z",
  },
  {
    id: "2",
    category: "hotel",
    destination: "Sousse",
    ruleType: "markup_percentage",
    value: 12,
    isActive: true,
    createdAt: "2026-01-15T10:00:00Z",
    updatedAt: "2026-06-20T14:30:00Z",
  },
  {
    id: "3",
    category: "istanbul",
    destination: "Istanbul",
    ruleType: "discount_fixed",
    value: 50,
    isActive: true,
    createdAt: "2026-02-10T09:00:00Z",
    updatedAt: "2026-06-21T08:15:00Z",
  },
  {
    id: "4",
    category: "omra",
    destination: null,
    ruleType: "override",
    value: 3850,
    isActive: true,
    createdAt: "2026-03-05T11:00:00Z",
    updatedAt: "2026-06-21T08:15:00Z",
  },
  {
    id: "5",
    category: "flight",
    destination: null,
    ruleType: "markup_percentage",
    value: 8,
    isActive: false,
    createdAt: "2026-04-12T13:00:00Z",
    updatedAt: "2026-06-18T16:45:00Z",
  },
  {
    id: "6",
    category: "generic",
    destination: null,
    ruleType: "markup_percentage",
    value: 10,
    isActive: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-06-20T14:30:00Z",
  },
]

export function PricingDashboard({ initialRules = MOCK_RULES }: PricingDashboardProps) {
  const [rules, setRules] = useState<PricingRuleRow[]>(initialRules)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>("")

  const stats = useMemo(() => {
    const activeCount = rules.filter((r) => r.isActive).length
    const inactiveCount = rules.length - activeCount

    const destinations = rules
      .filter((r) => r.destination)
      .reduce((acc, rule) => {
        const dest = rule.destination as string
        acc[dest] = (acc[dest] || 0) + 1
        return acc
      }, {} as Record<string, number>)

    const topDestinations = Object.entries(destinations)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)

    const ruleTypes = rules.reduce((acc, rule) => {
      acc[rule.ruleType] = (acc[rule.ruleType] || 0) + 1
      return acc
    }, {} as Record<PricingRuleType, number>)

    const predominantType = Object.entries(ruleTypes).sort((a, b) => b[1] - a[1])[0]

    return { activeCount, inactiveCount, topDestinations, predominantType }
  }, [rules])

  const toggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((rule) =>
        rule.id === id ? { ...rule, isActive: !rule.isActive, updatedAt: new Date().toISOString() } : rule
      )
    )
  }

  const startEdit = (rule: PricingRuleRow) => {
    setEditingId(rule.id)
    setEditValue(rule.value.toString())
  }

  const saveEdit = (id: string) => {
    const numericValue = parseFloat(editValue)
    if (isNaN(numericValue) || numericValue < 0) return

    setRules((prev) =>
      prev.map((rule) =>
        rule.id === id
          ? { ...rule, value: numericValue, updatedAt: new Date().toISOString() }
          : rule
      )
    )
    setEditingId(null)
    setEditValue("")
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValue("")
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Gestion des règles de tarification
          </h1>
          <p className="text-sm text-muted-foreground">
            Supervisez et ajustez les marges, remises et prix forcés appliqués aux offres.
          </p>
        </div>

        {/* Grille de statistiques */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Règles actives</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.activeCount}</div>
              <p className="text-xs text-muted-foreground">{stats.inactiveCount} inactives</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Destinations ciblées</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.topDestinations.length}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {stats.topDestinations.map(([dest, count]) => (
                  <Badge key={dest} variant="secondary">
                    {dest} ({count})
                  </Badge>
                ))}
                {stats.topDestinations.length === 0 && (
                  <span className="text-xs text-muted-foreground">Aucune destination spécifique</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Type dominant</CardTitle>
              <Tag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {stats.predominantType ? RULE_TYPE_LABELS[stats.predominantType[0] as PricingRuleType] : "-"}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.predominantType ? `${stats.predominantType[1]} règles` : "Aucune donnée"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Marge moyenne</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {(() => {
                  const markupRules = rules.filter((r) => r.ruleType === "markup_percentage" && r.isActive)
                  if (markupRules.length === 0) return "-"
                  const avg = markupRules.reduce((sum, r) => sum + r.value, 0) / markupRules.length
                  return `${avg.toFixed(1)}%`
                })()}
              </div>
              <p className="text-xs text-muted-foreground">Sur les règles actives</p>
            </CardContent>
          </Card>
        </div>

        {/* Table des règles */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Règles de tarification</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Valeur</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id} className={!rule.isActive ? "opacity-60" : undefined}>
                      <TableCell className="font-medium capitalize">{rule.category}</TableCell>
                      <TableCell>{rule.destination || <span className="text-muted-foreground">Global</span>}</TableCell>
                      <TableCell>
                        <Badge variant={RULE_TYPE_COLORS[rule.ruleType]}>
                          {RULE_TYPE_LABELS[rule.ruleType]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {editingId === rule.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="h-8 w-24"
                              autoFocus
                            />
                            <Button size="sm" onClick={() => saveEdit(rule.id)}>
                              OK
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEdit}>
                              Annuler
                            </Button>
                          </div>
                        ) : (
                          <span className="font-mono text-sm">
                            {rule.ruleType === "markup_percentage" ? `${rule.value}%` : `${rule.value.toFixed(2)} TND`}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={rule.isActive ? "success" : "outline"}>
                          {rule.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => startEdit(rule)}
                            aria-label="Modifier la valeur"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant={rule.isActive ? "destructive" : "default"}
                            onClick={() => toggleRule(rule.id)}
                            aria-label={rule.isActive ? "Désactiver" : "Activer"}
                          >
                            {rule.isActive ? (
                              <PowerOff className="h-4 w-4" />
                            ) : (
                              <Power className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
