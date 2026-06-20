import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { I18nProvider } from "@/lib/i18n/provider"
import { MetaPixel } from "@/components/meta-pixel"
import { initializeSession } from "@/lib/actions/session"
import { BRAND_CONFIG } from "@/config/brand"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: BRAND_CONFIG.fullName,
  description: "AI-powered travel companion for Tunisia and beyond",
  icons: {
    icon: BRAND_CONFIG.logo.favicon,
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  await initializeSession()

  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <I18nProvider>
          <MetaPixel />
          {children}
        </I18nProvider>
      </body>
    </html>
  )
}
