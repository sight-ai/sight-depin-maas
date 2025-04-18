'use client'

import Image from 'next/image'
import { Navigation } from './sidebar/Navigation'
import { ThemeSwitch } from './sidebar/ThemeSwitch'
import { useThemeCus } from '@/hooks/useTheme'
import { motion } from 'framer-motion'

export function Sidebar() {
    const { isDark } = useThemeCus()
    return (
        <aside style={{
            width: '16rem', position: 'fixed', top: 0, left: 0, overflow: 'hidden',
            backgroundColor: isDark ? '#151515' : '#f6f6f5'
        }} className="flex flex-col justify-between bg-secondary-light h-screen"
        >
            <motion.div 
                className="flex items-center justify-center mb-15 mt-12 pl-5 pr-5" 
                style={{
                    width: '100%',
                    height: '6rem',
                }}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                    duration: 0.6,
                    ease: "easeOut"
                }}
            >
                <motion.div
                    whileHover={{ 
                        scale: 1.05,
                        filter: "brightness(1.1)",
                        transition: { duration: 0.2 }
                    }}
                    whileTap={{ scale: 0.95 }}
                >
                    <Image 
                        src={isDark ? "/LOGO-H-white.png" : "/LOGO-H-black.png"} 
                        alt="SIGHT Logo" 
                        width={192} 
                        height={68} 
                        className="w-auto h-auto"
                    />
                </motion.div>
            </motion.div>
            <Navigation />
            <ThemeSwitch />
        </aside>
    )
}