import { useThemeCus } from '@/hooks/useTheme'
import Image from 'next/image'

export const Header = () => {
    let { isDark } = useThemeCus()

    return <div className="flex justify-end gap-5">
    <div className="flex items-center gap-3 h-20">
        <div className="w-20 h-20 rounded-full" >
             <Image src="/Ellipse 1.svg" alt="SIGHT Logo" width={213} height={100} className="mr-2" />
        </div>
        <span className="text-black" style={{ fontSize: 25, fontWeight: 800, color: isDark? '#fff':'' }}><span style={{color: isDark ? "#fff":'#545454'}}>Hello, </span>Lydia!</span>
    </div>
    </div>
}