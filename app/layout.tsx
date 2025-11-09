import type React from "react"
import type { Metadata } from "next"

import { Suspense } from "react"
import { Analytics } from "@vercel/analytics/react"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

import { Inter, JetBrains_Mono, Libre_Baskerville as V0_Font_Libre_Baskerville, IBM_Plex_Mono as V0_Font_IBM_Plex_Mono, Lora as V0_Font_Lora } from 'next/font/google'

// Initialize fonts
const _libreBaskerville = V0_Font_Libre_Baskerville({ subsets: ['latin'], weight: ["400","700"], variable: '--v0-font-libre-baskerville' })
const _ibmPlexMono = V0_Font_IBM_Plex_Mono({ subsets: ['latin'], weight: ["100","200","300","400","500","600","700"], variable: '--v0-font-ibm-plex-mono' })
const _lora = V0_Font_Lora({ subsets: ['latin'], weight: ["400","500","600","700"], variable: '--v0-font-lora' })
const _v0_fontVariables = `${_libreBaskerville.variable} ${_ibmPlexMono.variable} ${_lora.variable}`

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
})

export const metadata: Metadata = {
  title: "Open Banana",
  description: "Created with v0",
  generator: "v0.app",
  icons: {
    icon: "/favicon.ico",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className={`font-mono antialiased ${_v0_fontVariables}`}>
        <Suspense fallback={null}>{children}</Suspense>
        <Analytics />
      </body>
    </html>
  )
}
