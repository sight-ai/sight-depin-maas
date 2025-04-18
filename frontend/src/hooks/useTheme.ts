import { useTheme } from 'next-themes'
import { useEffect, useCallback } from 'react'

export const useThemeCus = () => {
    const { theme, setTheme } = useTheme()

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme')
        // 从 localStorage 读取主题
        if (savedTheme && theme !== savedTheme) {
            setTheme(savedTheme)
        }
    }, [])

    const updateTheme = useCallback((newTheme: string) => {
        setTheme(newTheme)
        localStorage.setItem('theme', newTheme)
        // 触发一个自定义事件，通知其他组件主题已更改
        window.dispatchEvent(new Event('storage'))
    }, [setTheme])

    const toggleTheme = useCallback(() => {
        const newTheme = theme === 'dark' ? 'light' : 'dark'
        updateTheme(newTheme)
    }, [theme, updateTheme])

    return {
        theme,
        setTheme: updateTheme,
        toggleTheme,
        isDark: theme === 'dark'
    }
}