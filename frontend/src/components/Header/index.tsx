import { useThemeCus } from '@/hooks/useTheme'
import { Button } from '@nextui-org/button'
import Image from 'next/image'
import { useDevice } from '@/hooks/useDevice'

export const Header = () => {
    const { isDark } = useThemeCus()
    const { data } = useDevice()

    const formatAddress = (address: string) => {
        if (!address) return '0x00...0000'
        return `${address.slice(0, 4)}...${address.slice(-4)}`
    }

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
                    0 Point | {formatAddress(data?.rewardAddress || '')}
                </span>
            </Button>
        </div>
    </div>
}