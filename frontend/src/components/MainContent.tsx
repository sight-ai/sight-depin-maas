'use client'

import { Sidebar } from '@/components/Sidebar'

export function MainContent({children}: { children: React.ReactNode}) {
  return (
    <div className="flex h-full bg-background">
      <Sidebar />
      <div className="w-full ml-64 overflow-y-auto h-screen">
        {children}
      </div>
    </div>
  )
}