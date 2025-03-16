'use client'

import Image from 'next/image'
import { Navigation } from './sidebar/Navigation'
import { ThemeSwitch } from './sidebar/ThemeSwitch'
import { useThemeCus } from '@/hooks/useTheme'

export function Sidebar() {
    const { isDark } = useThemeCus()
    return (
        <aside style={{
            width: '16rem', position: 'fixed', top: 0, left: 0, overflow: 'hidden',
            backgroundColor: isDark ? '#151515' : '#f6f6f5'
        }} className="flex flex-col justify-between bg-secondary-light h-screen"
        >
            <div className="flex items-center justify-center mb-15 mt-12 pl-5 pr-5">
                <Image src={isDark ? "/LOGO-H-white.png" : "/LOGO-H-black.png"} alt="SIGHT Logo" width={130} height={58} className="w-auto h-auto" />
            </div>
            <Navigation />
            <ThemeSwitch />
        </aside>
    )
}