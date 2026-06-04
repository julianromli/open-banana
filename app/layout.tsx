import type React from "react"
import type { Metadata } from "next"

import { Suspense } from "react"
import { ClerkProvider } from "@clerk/nextjs"
import { AuthHeader } from "@/components/auth-header"
import { getClerkProxyUrl } from "@/lib/clerk-proxy-url"
import { getSiteUrl } from "@/lib/site-url"
import "./globals.css"

const siteUrl = getSiteUrl()
const clerkProxyUrl = getClerkProxyUrl()
const clerkProviderProps = clerkProxyUrl ? { proxyUrl: clerkProxyUrl } : {}

import { Inter, JetBrains_Mono, Libre_Baskerville as V0_Font_Libre_Baskerville, IBM_Plex_Mono as V0_Font_IBM_Plex_Mono, Lora as V0_Font_Lora } from 'next/font/google'

// Initialize fonts
const _libreBaskerville = V0_Font_Libre_Baskerville({ subsets: ['latin'], weight: ["400","700"], variable: '--v0-font-libre-baskerville' })
const _ibmPlexMono = V0_Font_IBM_Plex_Mono({ subsets: ['latin'], weight: ["100","200","300","400","500","600","700"], variable: '--v0-font-ibm-plex-mono' })
const _lora = V0_Font_Lora({ subsets: ['latin'], weight: ["400","500","600","700"], variable: '--v0-font-lora' })
const _v0_fontVariables = `${_libreBaskerville.variable} ${_ibmPlexMono.variable} ${_lora.variable}`

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
})

export const metadata: Metadata = {
  title: "Free AI Image Generator | Open Banana - Create & Edit Images Online",
  description:
    "Generate and edit stunning images with Open Banana's free AI image generator. Powered by Nano Banana 2. Sign in to generate and create AI images instantly.",
  keywords:
    "free ai image generator, ai image generator, free ai image, nano banana, nano banana 2, edit image ai, image generator, ai art generator, free image creator",
  authors: [{ name: "Faiz Intifada", url: "https://www.threads.net/@faizintifada" }],
  creator: "Faiz Intifada",
  publisher: "Open Banana",
  generator: "v0.app",
  applicationName: "Open Banana",
  referrer: "origin-when-cross-origin",
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "https://elyql1q8be.ufs.sh/f/SidHyTM6vHFNkrTSPMxqrLXWoAOxHZEIn5u8KwidYCeQ4cFR",
    apple: "https://elyql1q8be.ufs.sh/f/SidHyTM6vHFNkrTSPMxqrLXWoAOxHZEIn5u8KwidYCeQ4cFR",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Open Banana",
    title: "Free AI Image Generator | Open Banana - Create & Edit Images",
    description:
      "Generate and edit stunning images with Open Banana's free AI image generator. Powered by Nano Banana 2. Sign in to generate.",
    images: [
      {
        url: "https://elyql1q8be.ufs.sh/f/SidHyTM6vHFNFsDt8oH1P04aAtJ7bsxYMZFTpWVcnBz9jLhe",
        width: 1200,
        height: 630,
        alt: "Open Banana - Free AI Image Generator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free AI Image Generator | Open Banana",
    description: "Generate and edit stunning images with AI. Powered by Nano Banana 2. Free tier available.",
    creator: "@faizintifada",
    images: ["https://elyql1q8be.ufs.sh/f/SidHyTM6vHFNFsDt8oH1P04aAtJ7bsxYMZFTpWVcnBz9jLhe"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
}

/** Force dynamic rendering so Clerk is never prerendered statically */
export const dynamic = "force-dynamic"

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider {...clerkProviderProps}>
      <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
        <head>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@graph": [
                  {
                    "@type": "WebSite",
                    "@id": `${siteUrl}/#website`,
                    url: `${siteUrl}/`,
                    name: "Open Banana",
                    description: "Free AI Image Generator - Create and edit images with AI",
                    publisher: {
                      "@id": `${siteUrl}/#organization`,
                    },
                    potentialAction: {
                      "@type": "SearchAction",
                      target: {
                        "@type": "EntryPoint",
                        urlTemplate: `${siteUrl}/?q={search_term_string}`,
                      },
                      "query-input": "required name=search_term_string",
                    },
                  },
                  {
                    "@type": "Organization",
                    "@id": `${siteUrl}/#organization`,
                    name: "Open Banana",
                    url: `${siteUrl}/`,
                    logo: {
                      "@type": "ImageObject",
                      url: "https://elyql1q8be.ufs.sh/f/SidHyTM6vHFNkrTSPMxqrLXWoAOxHZEIn5u8KwidYCeQ4cFR",
                    },
                  },
                  {
                    "@type": "SoftwareApplication",
                    name: "Open Banana",
                    applicationCategory: "DesignApplication",
                    offers: {
                      "@type": "Offer",
                      price: "0",
                      priceCurrency: "USD",
                    },
                    operatingSystem: "Web Browser",
                    description:
                      "Free AI image generator powered by Nano Banana 2. Create and edit stunning images with artificial intelligence.",
                    screenshot: "https://elyql1q8be.ufs.sh/f/SidHyTM6vHFNFsDt8oH1P04aAtJ7bsxYMZFTpWVcnBz9jLhe",
                    aggregateRating: {
                      "@type": "AggregateRating",
                      ratingValue: "4.8",
                      ratingCount: "100",
                    },
                  },
                  {
                    "@type": "WebPage",
                    "@id": `${siteUrl}/#webpage`,
                    url: `${siteUrl}/`,
                    name: "Free AI Image Generator | Open Banana",
                    description: "Generate and edit stunning images with AI. Sign in to generate.",
                    isPartOf: {
                      "@id": `${siteUrl}/#website`,
                    },
                    about: {
                      "@id": `${siteUrl}/#organization`,
                    },
                    primaryImageOfPage: {
                      "@type": "ImageObject",
                      url: "https://elyql1q8be.ufs.sh/f/SidHyTM6vHFNFsDt8oH1P04aAtJ7bsxYMZFTpWVcnBz9jLhe",
                    },
                  },
                ],
              }),
            }}
          />
        </head>
        <body className={`font-mono antialiased ${_v0_fontVariables}`}>
          <AuthHeader />
          <Suspense fallback={null}>{children}</Suspense>
        </body>
      </html>
    </ClerkProvider>
  )
}
