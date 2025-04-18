import { useTheme } from 'next-themes'

export const useThemeCus = () => {
    const { theme, setTheme } = useTheme()
    console.log(theme)
    return {
        theme,
        setTheme,
        isDark: theme == 'dark'
    }
}