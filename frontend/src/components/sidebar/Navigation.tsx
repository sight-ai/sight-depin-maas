'use client'

import { useThemeCus } from '@/hooks/useTheme'
import { Button } from '@nextui-org/button'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navigation = [
    {
        name: 'Dashboard', href: '/dashboard',
        dark: {
            active: '/Dashboard Layout.svg', icon: '/Dashboard Layout a.svg'
        },
        light: {
            icon: '/Dashboard Layout.svg', active: '/Dashboard Layout a.svg'
        }
    },
    {
        name: 'History', href: '/history',
        dark: {
            active: '/Activity History.svg', icon: '/Activity History a.svg'
        },
        light: {
            icon: '/Activity History.svg', active: '/Activity History a.svg'
        }
    },
    {
        name: 'Referral Program', href: '/referral',

        dark: {
            active: '/Bookmark.svg', icon: '/Bookmark (1).svg'
        },
        light: {
            icon: '/Bookmark.svg', active: '/Bookmark (1).svg'
        }
    },
    {
        name: 'Node', href: '/node',

        dark: {
            active: '/Connect.svg', icon: '/Connect (1).svg'

        },
        light: {
            icon: '/Connect.svg', active: '/Connect (1).svg'
        }
    }
]

export function Navigation() {
    const pathname = usePathname()
    const { isDark } = useThemeCus()

    return (
        <nav className='flex flex-col items-center w-full'>
            {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                    <Link key={item.name} href={item.href} style={{
                        width: '13rem'
                    }}>
                        <Button
                            style={isDark ? {
                                width: '100%',
                                borderRadius: '3rem',
                                backgroundColor: isActive ? '#fff' : '#000',
                                color: isActive ? '#000' : '#fff',
                            } : {
                                width: '100%',
                                backgroundColor: isActive ? '#000' : '#fff',
                                color: isActive ? '#fff' : '#000',
                                borderRadius: '3rem',
                            }}
                            className={`flex items-center mb-8 justify-center gap-4 py-3 px-4 ${isActive ? 'bg-black text-white' : 'bg-white text-black hover:bg-hover-ligh'}`}
                            variant="light"
                        >
                            <Image src={isActive ? item[isDark ? 'dark': 'light'].active :  item[isDark ? 'dark': 'light'].icon} alt="" width={20} height={20} className="w-5 h-5" />
                            <span className="text-base " style={{
                                fontWeight: 800,
                            }}>{item.name}</span>
                        </Button>
                    </Link>
                )
            })}
        </nav>
    )
}