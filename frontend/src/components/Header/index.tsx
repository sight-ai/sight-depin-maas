import { useThemeCus } from '@/hooks/useTheme'
import { Button } from '@nextui-org/button'
import Image from 'next/image'

export const Header = () => {
    const { isDark } = useThemeCus()

    return <div className="flex justify-end gap-5">
        <div className="flex items-center gap-3 h-20">
            {/* <Button
                style={{
                    borderRadius: '3rem',
                    backgroundColor: isDark ? '#fff' : '#000',
                    padding: '0.5rem 1rem',
                }}
                className="flex items-center justify-center gap-2"
                variant="light"
            >
                <span className="font-medium flex items-center" style={{
                    color: isDark ? '#000' : '#fff'
                }}>
                    Active Devices
                </span>
            </Button> */}

            <Button
                style={{
                    borderRadius: '3rem',
                    backgroundColor: isDark ? '#fff' : '#000',
                    padding: '0.5rem 1rem',
                }}
                className="flex items-center justify-center gap-2"
                variant="light"
            >
                <span className="font-medium flex items-center" style={{
                    color: isDark ? '#000' : '#fff'
                }}>
                    0 Point | 0x44...3d92
                </span>
            </Button>
        </div>
    </div>
}