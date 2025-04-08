'use client'

import { NextUIProvider } from '@nextui-org/react'
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ConfigProvider, theme } from 'antd';
import { useThemeCus } from '@/hooks/useTheme';

export function Providers({ children }: { children: React.ReactNode }) {
  const { isDark } = useThemeCus();

  return (
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
        <NextThemesProvider 
          attribute="class" 
          defaultTheme="light" 
          enableSystem
          themes={['light', 'dark', 'system']}
        >
          {children}
        </NextThemesProvider>
      </NextUIProvider>
    </ConfigProvider>
  )
}