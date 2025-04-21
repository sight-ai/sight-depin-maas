'use client'

import { NextUIProvider } from '@nextui-org/react'
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ConfigProvider, theme } from 'antd';
import { useEffect, useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem('theme')
    setIsDark(savedTheme === 'dark')
  }, [])

  useEffect(() => {
    const handleStorageChange = () => {
      const savedTheme = localStorage.getItem('theme')
      setIsDark(savedTheme === 'dark')
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <NextThemesProvider 
      attribute="class" 
      defaultTheme="light" 
      storageKey="theme"
      enableSystem={false}
      value={{
        light: "light",
        dark: "dark"
      }}
    >
      <ConfigProvider
        theme={{
          algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: {
            colorPrimary: '#000',
            borderRadius: 8,
          },
        }}
      >
        <NextUIProvider>
          {children}
        </NextUIProvider>
      </ConfigProvider>
    </NextThemesProvider>
  )
}