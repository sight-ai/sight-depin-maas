'use client'

import { useThemeCus } from '@/hooks/useTheme'

export function ThemeSwitch() {
    const { theme, setTheme } = useThemeCus()

    return (
        <div className="p-5 ">
            <div className="flex items-center justify-between">
                <div className='flex flex-col '>
                    <span className="text-base font-medium">DAYTIME</span>
                    <span className="text-base font-medium">THEME</span>
                </div>
                <div
                    className={`switch-wrapper ${theme === 'dark' ? 'dark' : 'light'}`}
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                >
                    <div className="switch-bg"></div>
                    <div className="switch-thumb"></div>
                </div>
            </div>
        </div>
    )
}