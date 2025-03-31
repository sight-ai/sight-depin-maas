'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Header } from '@/components/Header'
import { MainContent } from '@/components/MainContent'
import { useHistory } from '@/hooks/useHistory'
import { Loader2 } from "lucide-react"

export default function HistoryPage() {
    const { historyItems, loading, error } = useHistory()

    return (
        <MainContent>
            <main className="flex-1 p-8 space-y-8">
                <Header />
                <Card>
                    <CardHeader>
                        <CardTitle>History</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex items-center justify-center h-[200px]">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : error ? (
                            <div className="text-destructive text-center">{error}</div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-center">
                                            <div className='inline-block text-base font-bold bg-primary text-primary-foreground rounded-full px-4 py-2 w-[100px]'>
                                                Status
                                            </div>
                                        </TableHead>
                                        <TableHead className="text-center">
                                            <div className='inline-block text-base font-bold bg-primary text-primary-foreground rounded-full px-4 py-2 w-[130px]'>
                                                Request ID
                                            </div>
                                        </TableHead>
                                        <TableHead className="text-center">
                                            <div className='inline-block text-base font-bold bg-primary text-primary-foreground rounded-full px-4 py-2 w-[150px]'>
                                                Token Usage
                                            </div>
                                        </TableHead>
                                        <TableHead className="text-center">
                                            <div className='inline-block text-base font-bold bg-primary text-primary-foreground rounded-full px-4 py-2 w-[100px]'>
                                                Reward
                                            </div>
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {historyItems.map((item, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="text-center">
                                                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-base min-w-[120px] justify-center
                                                    ${item.status === 'In-Progress' 
                                                        ? 'bg-warning text-warning-foreground' 
                                                        : item.status === 'Done'
                                                            ? 'bg-success text-success-foreground'
                                                            : 'bg-destructive text-destructive-foreground'
                                                    }`}
                                                >
                                                    {item.status !== 'In-Progress' && (
                                                        <span className="w-2 h-2 rounded-full bg-current" />
                                                    )}
                                                    {item.status}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {item.requestId}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {item.tokenUsage}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {item.reward}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </main>
        </MainContent>
    )
}