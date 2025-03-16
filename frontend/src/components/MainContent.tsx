'use client'

import { Sidebar } from '@/components/Sidebar'
import { useThemeCus } from '@/hooks/useTheme'

export function MainContent({children}: { children: React.ReactNode}) {
  const { isDark } = useThemeCus()

  return (
    <div className="flex h-full bg-primary-light">
      <Sidebar />
      <div style={{ width: '100%', marginLeft: '16rem', overflowY: 'auto', height: '100vh', backgroundColor: isDark? '#000': '#fff' }}>
        {children}
      </div>
    </div>
  )
}