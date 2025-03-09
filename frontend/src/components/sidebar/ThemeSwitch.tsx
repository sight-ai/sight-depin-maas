'use client'

import { useThemeCus } from '@/hooks/useTheme'
import { Switch } from '@nextui-org/switch'

export function ThemeSwitch() {
    const { theme, setTheme } = useThemeCus()

    return (
        <div className="p-5 ">
            <div className="flex items-center justify-between">
                <div className='flex flex-col '>
                    <span className="text-base font-medium">DAYTIME</span>
                    <span className="text-base font-medium">THEME</span>
                </div>
                <Switch
                    isSelected={theme === 'dark'}
                    onValueChange={(isSelected) => setTheme(isSelected ? 'dark' : 'light')}
                    size="lg"
                    classNames={{
                        wrapper: "p-0 h-10 w-20 bg-white border-2 border-black p-1",
                        thumb: "w-7 h-7 bg-black transform transition-transform duration-200 ease-in-out",
                        base: "transition-all duration-200"
                    }}
                    >
                </Switch>
            </div>
        </div>
    )
}