export const BRAND_CONFIG = {
  name: "Easy2Book",
  fullName: "Easy2Book Travel Planner",
  tagline: {
    fr: "Votre compagnon de voyage IA",
    en: "Your AI travel companion",
    ar: "مساعد السفر الذكي الخاص بك",
  },
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "+21600000000",
  email: process.env.NEXT_PUBLIC_BRAND_EMAIL || "contact@easy2book.tn",
  currency: "TND",
  socials: {
    facebook: process.env.NEXT_PUBLIC_FACEBOOK_URL || "https://facebook.com/easy2book",
    instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://instagram.com/easy2book",
    website: process.env.NEXT_PUBLIC_WEBSITE_URL || "https://easy2book.tn",
  },
  logo: {
    light: "/assets/logo.jpg",
    dark: "/assets/logo.jpg",
    favicon: "/assets/logo.jpg",
  },
} as const

export type BrandConfig = typeof BRAND_CONFIG
