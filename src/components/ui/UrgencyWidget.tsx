"use client"

/**
 * UrgencyWidget.tsx
 *
 * Composant d'alerte d'urgence dynamique pour Easy2Book.
 * - Affiche un badge clignotant lorsque le nombre de places restantes est inférieur au seuil.
 * - Design mobile-first, compact et compatible avec les layouts `h-dvh`.
 * - Micro-interactions natives Tailwind CSS v4 (hover, active, transition).
 */

import { cn } from "@/lib/utils"
import { AlertTriangle, Users, Zap } from "lucide-react"

interface UrgencyWidgetProps {
  placesRestantes: number
  seuil?: number
  message?: string
  className?: string
  variant?: "inline" | "banner"
}

export function UrgencyWidget({
  placesRestantes,
  seuil = 3,
  message,
  className,
  variant = "inline",
}: UrgencyWidgetProps) {
  const isUrgent = placesRestantes > 0 && placesRestantes <= seuil
  const isSoldOut = placesRestantes <= 0

  const displayMessage =
    message ||
    (isSoldOut
      ? "Session complète. Inscrivez-vous en liste d'attente."
      : isUrgent
      ? `Plus que ${placesRestantes} place${placesRestantes > 1 ? "s" : ""} disponible${placesRestantes > 1 ? "s" : ""} pour cette session !`
      : `${placesRestantes} places restantes`)

  if (variant === "banner") {
    return (
      <div
        className={cn(
          "w-full px-4 py-2.5 text-center text-sm font-medium",
          "transition-all duration-300 ease-out",
          isSoldOut
            ? "bg-muted text-muted-foreground"
            : isUrgent
            ? "bg-amber-500 text-white animate-pulse"
            : "bg-green-100 text-green-800",
          className
        )}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center justify-center gap-2">
          {isSoldOut ? <Users className="h-4 w-4" /> : isUrgent ? <AlertTriangle className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
          <span>{displayMessage}</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium",
        "transition-all duration-200 ease-out",
        "hover:scale-[1.02] active:scale-[0.98]",
        "select-none",
        isSoldOut
          ? "bg-muted text-muted-foreground"
          : isUrgent
          ? "bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/40 animate-pulse"
          : "bg-green-100 text-green-800 ring-1 ring-green-500/20",
        className
      )}
      role="status"
      aria-live="polite"
    >
      {isSoldOut ? (
        <Users className="h-3.5 w-3.5" />
      ) : isUrgent ? (
        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
      ) : (
        <Zap className="h-3.5 w-3.5 text-green-600" />
      )}
      <span>{displayMessage}</span>
    </div>
  )
}
