import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { LayoutClient } from "@/components/layout-client"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Sayariq System",
  description: "Sistema integral de gestión empresarial",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <LayoutClient>{children}</LayoutClient>
      </body>
    </html>
  )
}
