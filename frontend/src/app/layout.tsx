'use client'

import { ThemeProvider } from "next-themes"
import { NextUIProvider } from "@nextui-org/react"
import './globals.css'
import './styles/fonts.css'


export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body style={{
      }}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextUIProvider>
            {children}
          </NextUIProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}