"use client"

import { useState, useEffect } from "react"
import { LayoutDashboard, Hotel, Flame, Users, MessageSquare, Calendar, Settings, Plane, Ship, Compass, TrendingUp, Home } from "lucide-react"
import { cn } from "@/lib/utils"

type Tab = "dashboard" | "hotels" | "guesthouses" | "flights" | "boats" | "promotions" | "leads" | "conversations" | "reservations" | "excursions" | "marketing" | "settings"

const menuItems: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "📊 Dashboard", icon: LayoutDashboard },
  { id: "hotels", label: "🏨 Hôtels", icon: Hotel },
  { id: "guesthouses", label: "🏡 Maisons d'hôtes", icon: Home },
  { id: "flights", label: "✈ Vols", icon: Plane },
  { id: "boats", label: "⛴ Bateaux", icon: Ship },
  { id: "excursions", label: "🎯 Excursions", icon: Compass },
  { id: "promotions", label: "🔥 Promotions", icon: Flame },
  { id: "leads", label: "👥 Clients", icon: Users },
  { id: "conversations", label: "💬 Conversations IA", icon: MessageSquare },
  { id: "reservations", label: "📅 Réservations", icon: Calendar },
  { id: "marketing", label: "📈 Marketing", icon: TrendingUp },
  { id: "settings", label: "⚙ Paramètres", icon: Settings },
]

export default function CRMDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard")
  const [data, setData] = useState<Record<string, unknown>>({})

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/hotels")
        const hotelsData = await res.json()
        setData((prev) => ({ ...prev, hotels: hotelsData.hotels || [] }))
      } catch {
        // ignore
      }
    }
    fetchData()
  }, [activeTab])

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Easy2Book CRM</h1>
          <p className="text-xs text-gray-500 mt-1">Tableau de bord interne</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  activeTab === item.id
                    ? "bg-primary text-primary-foreground"
                    : "text-gray-600 hover:bg-gray-100"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </button>
            )
          })}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <p className="text-xs text-gray-400">📞 +216 98140514</p>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        {activeTab === "dashboard" && <DashboardView data={data} />}
        {activeTab === "hotels" && <HotelsView data={data} />}
        {activeTab === "guesthouses" && <PlaceholderView title="🏡 Maisons d'hôtes" />}
        {activeTab === "flights" && <PlaceholderView title="✈ Vols" />}
        {activeTab === "boats" && <PlaceholderView title="⛴ Bateaux" />}
        {activeTab === "excursions" && <PlaceholderView title="🎯 Excursions" />}
        {activeTab === "promotions" && <PromotionsView />}
        {activeTab === "leads" && <LeadsView />}
        {activeTab === "conversations" && <ConversationsView />}
        {activeTab === "reservations" && <ReservationsView />}
        {activeTab === "marketing" && <MarketingView />}
        {activeTab === "settings" && <SettingsView />}
      </main>
    </div>
  )
}

function DashboardView({ data }: { data: Record<string, unknown> }) {
  const hotels = (data.hotels as unknown[]) || []
  const stats = [
    { label: "Hôtels actifs", value: hotels.length, color: "bg-blue-500" },
    { label: "Promotions actives", value: 0, color: "bg-orange-500" },
    { label: "Prospects", value: 0, color: "bg-green-500" },
    { label: "Réservations", value: 0, color: "bg-purple-500" },
  ]

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">📊 Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center mb-4", stat.color)}>
              <span className="text-white text-xl font-bold">{stat.value}</span>
            </div>
            <p className="text-sm text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function HotelsView({ data }: { data: Record<string, unknown> }) {
  const hotels = (data.hotels as Array<Record<string, unknown>>) || []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">🏨 Hôtels</h2>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
          + Ajouter
        </button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Destination</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Étoiles</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prix/nuit</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {hotels.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                  Aucun hôtel trouvé
                </td>
              </tr>
            ) : (
              hotels.map((hotel, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{String(hotel.destination || "—")}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{String(hotel.destination || "—")}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{"⭐".repeat(Number(hotel.stars) || 0)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{String(hotel.basePricePerNight || "—")} DT</td>
                  <td className="px-6 py-4">
                    <span className={cn("px-2 py-1 rounded-full text-xs font-medium", hotel.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                      {hotel.isActive ? "Actif" : "Inactif"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PromotionsView() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">🔥 Promotions</h2>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
          + Ajouter
        </button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-400">
        Aucune promotion active
      </div>
    </div>
  )
}

function LeadsView() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">👥 Prospects</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-400">
        Aucun prospect enregistré
      </div>
    </div>
  )
}

function ConversationsView() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">💬 Conversations</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-400">
        Aucune conversation enregistrée
      </div>
    </div>
  )
}

function ReservationsView() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">📅 Réservations</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-400">
        Aucune réservation enregistrée
      </div>
    </div>
  )
}

function SettingsView() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">⚙ Paramètres</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp</label>
          <input type="text" value="+216 98140514" readOnly className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
          <input type="text" value="contact@easy2book.tn" readOnly className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50" />
        </div>
      </div>
    </div>
  )
}

function PlaceholderView({ title }: { title: string }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{title}</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-400">
        Module en cours de configuration
      </div>
    </div>
  )
}

function MarketingView() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">📈 Marketing</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {[
          { label: "🔥 Offre Flash", desc: "Promotions limitées dans le temps" },
          { label: "👨‍👩‍👧 Promo Famille", desc: "Offres familiales" },
          { label: "💑 Promo Couple", desc: "Séjours romantiques" },
          { label: "⚡ Last Minute", desc: "Départs imminents" },
        ].map((offer) => (
          <div key={offer.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-lg font-bold text-gray-900 mb-2">{offer.label}</p>
            <p className="text-sm text-gray-500">{offer.desc}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-400">
        Aucune campagne marketing active
      </div>
    </div>
  )
}
