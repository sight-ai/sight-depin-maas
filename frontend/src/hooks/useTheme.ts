import { useTheme } from 'next-themes'

export const useThemeCus = () => {
    const { theme, setTheme } = useTheme()
    return {
        theme,
        setTheme,
        isDark: theme == 'dark'
    }
}