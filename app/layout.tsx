import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { LayoutClient } from "@/components/layout-client"

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
      <body className="font-sans" suppressHydrationWarning>
        <LayoutClient>{children}</LayoutClient>
      </body>
    </html>
  )
}
