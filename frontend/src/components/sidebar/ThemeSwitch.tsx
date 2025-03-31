'use client'

import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Moon, Sun } from 'lucide-react'

export function ThemeSwitch() {
    const { theme, setTheme } = useTheme()

    return (
        <div className="p-5">
            <div className="flex items-center justify-between">
                <div className='flex flex-col'>
                    <span className="text-base font-medium text-foreground">DAYTIME</span>
                    <span className="text-base font-medium text-foreground">THEME</span>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="rounded-full"
                >
                    <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                </Button>
            </div>
        </div>
    )
}