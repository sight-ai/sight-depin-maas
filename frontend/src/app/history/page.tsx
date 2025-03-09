'use client'

import { Card } from '@nextui-org/react'
import { Header } from '@/components/Header'
import { MainContent } from '@/components/MainContent'
import { useHistory } from '@/hooks/useHistory'
import { useThemeCus } from '@/hooks/useTheme'

export default function HistoryPage() {
    const { historyItems, loading, error, refreshHistory } = useHistory()
    let { isDark } = useThemeCus()

    return (
        <MainContent>
            <main className="flex-1 p-8 space-y-8 bg-white" style={{
                backgroundColor: isDark ? '#000' : '#fff'
            }}>
                <Header></Header>
                <div style={{
                    fontWeight: 800,
                    fontSize: '3.125em',
                    color: isDark ? '#fff' : '#000',

                }}>History</div>
                <Card className="bg-white rounded-lg" style={{
                    backgroundColor: isDark ? '#1a1a1a' : '#f6f6f6'
                }}>
                    <div className="overflow-x-auto pt-3">
                        {loading && <div className="p-4 text-center">加载中...</div>}
                        {error && <div className="p-4 text-center text-red-500">{error}</div>}
                        <table className="min-w-full">
                            <thead>
                                <tr className="flex gap-4" style={{ width: '100%' }}>
                                    <th className="flex-1 px-6 py-3 flex justify-center" style={{ minWidth: '120px' }}>

                                        <div className='text-center text-base font-bold text-white bg-black rounded-lg' style={{ width: 100, padding: 10, borderRadius: 30, backgroundColor: isDark ? '#fff' : '#000', color: isDark ? '#000' : '#fff' }}>
                                            Status
                                        </div>
                                    </th>
                                    <th className="flex-1 px-6 py-3   flex justify-center" style={{ minWidth: '150px' }}>
                                        <div className='text-center text-base font-bold text-white bg-black rounded-lg' style={{ width: 130, padding: 10, borderRadius: 30, backgroundColor: isDark ? '#fff' : '#000', color: isDark ? '#000' : '#fff' }}>
                                            Request ID
                                        </div>
                                    </th>
                                    <th className="flex-1 px-6 py-3  flex justify-center" style={{ minWidth: '150px' }}> <div className='text-center text-base font-bold text-white bg-black rounded-lg' style={{ width: 150, padding: 10, borderRadius: 30, backgroundColor: isDark ? '#fff' : '#000', color: isDark ? '#000' : '#fff' }}>
                                        Token Usage
                                    </div></th>
                                    <th className="flex-1 px-6 py-3  flex justify-center" style={{ minWidth: '120px' }}> <div className='text-center text-base font-bold text-white bg-black rounded-lg' style={{ width: 100, padding: 10, borderRadius: 30, backgroundColor: isDark ? '#fff' : '#000', color: isDark ? '#000' : '#fff' }}>
                                        Reward
                                    </div></th>
                                </tr>
                            </thead>
                            <tbody>
                                {historyItems.map((item, index) => (
                                    <tr key={index} className="flex gap-4" style={{ width: '100%' }}>
                                        <td
                                            className="flex-1 px-6 py-4 text-base text-center text-black"
                                            style={{ minWidth: '120px' }}
                                        >
                                            <div
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: item.status === 'In-Progress' ? '6px 16px' : '8px 12px',
                                                    borderRadius: '999px',
                                                    fontWeight: 'bold',
                                                    fontSize: '16px',
                                                    minWidth: 120,
                                                    justifyContent: 'center',
                                                    background:
                                                        item.status === 'In-Progress'
                                                            ? 'linear-gradient(90deg, #d4f4a6, #ffe58f)'
                                                            :  isDark ?'#1a1a1a':'#efefef', // 默认灰色背景
                                                    boxShadow: isDark ? '':'2px 2px 5px rgba(0, 0, 0, 0.1)',
                                                    color: isDark? item.status === 'In-Progress' ? '#000' : '#fff' : '#000',
                                                }}
                                            >
                                                {item.status !== 'In-Progress' && (
                                                    <span
                                                        style={{
                                                            width: '8px',
                                                            height: '8px',
                                                            borderRadius: '50%',
                                                            backgroundColor: item.status === 'Done' ? '#00c853' : '#d50000',
                                                            marginRight: 10
                                                        }}
                                                    />
                                                )}
                                                {item.status}
                                            </div>
                                        </td>

                                        <td className="flex-1 px-6 py-4 text-center text-base text-black" style={{ minWidth: '150px', color: isDark ? '#fff' : '#000', }}>{item.requestId}</td>
                                        <td className="flex-1 px-6 py-4 text-center text-base text-black" style={{ minWidth: '150px', color: isDark ? '#fff' : '#000', }}>{item.tokenUsage}</td>
                                        <td className="flex-1 px-6 py-4 text-center text-base text-black" style={{ minWidth: '120px', color: isDark ? '#fff' : '#000', }}>{item.reward}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </main>
        </MainContent>
    )
}