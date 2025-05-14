import { useThemeCus } from '@/hooks/useTheme'
import { Button } from '@nextui-org/button'
import Image from 'next/image'
import { useDevice } from '@/hooks/useDevice'

export const Header = () => {
    const { isDark } = useThemeCus()
    const { data, gatewayStatus } = useDevice()

    const formatAddress = (address: string) => {
        if (!address) return '0x00...0000'
        return `${address.slice(0, 5)}...${address.slice(-7)}`
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
                <span className="font-medium flex items-center gap-2" style={{
                    color: isDark ? '#000' : '#fff'
                }}>
                    <div className="flex items-center gap-2 font-ibm-mono">
                        <div className="flex items-center gap-1">
                            <div 
                                className="w-2 h-2 rounded-full" 
                                style={{
                                    backgroundColor: data?.status === 'connected' ? '#4CAF50' : '#F44336'
                                }}
                            />
                            <span className="text-xs">Ollama</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div 
                                className="w-2 h-2 rounded-full" 
                                style={{
                                    backgroundColor: gatewayStatus.isRegistered ? '#4CAF50' : '#F44336'
                                }}
                            />
                            <span className="text-xs">Gateway</span>
                        </div>
                    </div>
                </span>
            </Button>
           {!gatewayStatus.isRegistered && <Button
                onClick={() => {
                    window.open('https://sightai.io/model/gateway', '_blank')
                }}
                style={{
                    borderRadius: '3rem',
                    backgroundColor: isDark ? '#fff' : '#000',
                    padding: '0.5rem 1rem',
                }}
                className="flex items-center justify-center gap-2"
                variant="light"
            >
                <span className="font-medium flex items-center gap-2" style={{
                    color: isDark ? '#000' : '#fff'
                }}>
                    <div className="flex items-center gap-2 font-ibm-mono">
                    Active Devices 
                    </div>
                </span>
            </Button>}
            <Button
                style={{
                    borderRadius: '3rem',
                    backgroundColor: isDark ? '#fff' : '#000',
                    padding: '0.5rem 1rem',
                }}
                className="flex items-center justify-center gap-2"
                variant="light"
            >
                <span className="font-medium flex items-center gap-2" style={{
                    color: isDark ? '#000' : '#fff'
                }}>
                    <div className="flex items-center gap-2 font-ibm-mono">
                        {formatAddress(data?.reward_address || '')}
                    </div>
                </span>
            </Button>
        </div>
    </div>
}