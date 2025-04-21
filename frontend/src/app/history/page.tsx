'use client'

import { Card } from '@nextui-org/react'
import { Header } from '@/components/Header'
import { MainContent } from '@/components/MainContent'
import { useHistory } from '@/hooks/useHistory'
import { useThemeCus } from '@/hooks/useTheme'
import { Pagination, Select, Tooltip, Button } from 'antd'
import { useState } from 'react'
import { ConfigProvider, theme } from 'antd'
import { useDevice } from '@/hooks/useDevice'
import { motion, AnimatePresence } from 'framer-motion'
import { SyncOutlined } from '@ant-design/icons'

const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
}

const tableAnimation = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.3 }
}

const rowAnimation = {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.3 }
}

export default function HistoryPage() {
    const { historyItems, loading, error, page, setPage, pageSize, setPageSize, total, refreshHistory } = useHistory()
    const { isDark } = useThemeCus()
    const { gatewayStatus } = useDevice()

    const formatRequestId = (requestId: string) => {
        if (requestId.length <= 8) return requestId;
        return `${requestId.slice(0, 4)}...${requestId.slice(-4)}`;
    }

    return (
        <MainContent>
            <motion.main 
                initial="initial"
                animate="animate"
                className="flex-1 p-8 space-y-8 bg-white" 
                style={{
                    backgroundColor: isDark ? '#000' : '#fff'
                }}
            >
                <motion.div variants={fadeInUp}>
                    <Header></Header>
                </motion.div>

                <motion.div 
                    variants={fadeInUp}
                    style={{
                        fontWeight: 800,
                        fontSize: '3.125em',
                        color: isDark ? '#fff' : '#000',
                    }}
                >
                    History
                </motion.div>
                <div className="flex justify-between items-center mb-6">
                    <div className="text-xl font-medium" style={{ color: isDark ? '#fff' : '#000' }}>
                        History Overview
                    </div>
                    <Button 
                        type="primary"
                        icon={<SyncOutlined />}
                        style={{
                            backgroundColor: isDark ? '#333' : '#f0f0f0',
                            borderColor: 'transparent',
                            color: isDark ? '#fff' : '#000'
                        }}
                        onClick={refreshHistory}
                    >
                        Refresh
                    </Button>
                </div>
                <motion.div
                    variants={fadeInUp}
                >
                    <Card className="bg-white rounded-lg" style={{
                        backgroundColor: isDark ? '#1a1a1a' : '#f6f6f6'
                    }}>
                        <motion.div 
                            className="overflow-x-auto pt-3"
                            variants={tableAnimation}
                        >
                            <table className="min-w-full">
                                <thead>
                                    <motion.tr 
                                        className="flex gap-4" 
                                        style={{ width: '100%' }}
                                        variants={rowAnimation}
                                    >
                                        <th className="flex-1 px-6 py-3 flex justify-center" style={{ minWidth: '150px' }}>
                                            <div className='text-center text-base font-bold text-white bg-black rounded-lg' style={{ width: 130, padding: 10, borderRadius: 30, backgroundColor: '#000', color: '#fff' }}>
                                                Request ID
                                            </div>
                                        </th>
                                        <th className="flex-1 px-6 py-3 flex justify-center" style={{ minWidth: '120px' }}>
                                            <div className='text-center text-base font-bold text-white bg-black rounded-lg' style={{ width: 100, padding: 10, borderRadius: 30, backgroundColor: '#000', color: '#fff' }}>
                                                Status
                                            </div>
                                        </th>
                                        <th className="flex-1 px-6 py-3 flex justify-center" style={{ minWidth: '120px' }}>
                                            <div className='text-center text-base font-bold text-white bg-black rounded-lg' style={{ width: 100, padding: 10, borderRadius: 30, backgroundColor: '#000', color: '#fff' }}>
                                                Model
                                            </div>
                                        </th>
                                        <th className="flex-1 px-6 py-3 flex justify-center" style={{ minWidth: '200px' }}>
                                            <div className='text-center text-base font-bold text-white bg-black rounded-lg' style={{ width: 200, padding: 10, borderRadius: 30, backgroundColor: '#000', color: '#fff' }}>
                                                Token Usage
                                            </div>
                                        </th>
                                        <th className="flex-1 px-6 py-3 flex justify-center" style={{ minWidth: '120px' }}>
                                            <div className='text-center text-base font-bold text-white bg-black rounded-lg' style={{ width: 100, padding: 10, borderRadius: 30, backgroundColor: '#000', color: '#fff' }}>
                                                Reward
                                                {!gatewayStatus.isRegistered && (
                                                    <Tooltip 
                                                        title={
                                                            <div>
                                                                <p style={{ color: '#ff4d4f' }}>This is an estimate reward. 
                                                               </p>
                                                                <a href="https://sightai.io/model/gateway" target="_blank" style={{ color: '#1890ff' }}> Connect gateway to see actual rewards!</a>
                                                            </div>
                                                        }
                                                        color={isDark ? '#1a1a1a' : '#fff'}
                                                    >
                                                        <span style={{ 
                                                            marginLeft: '8px', 
                                                            cursor: 'pointer',
                                                            color: '#ff4d4f'
                                                        }}>?</span>
                                                    </Tooltip>
                                                )}
                                            </div>
                                        </th>
                                        <th className="flex-1 px-6 py-3 flex justify-center" style={{ minWidth: '120px' }}>
                                            <div className='text-center text-base font-bold text-white bg-black rounded-lg' style={{ width: 100, padding: 10, borderRadius: 30, backgroundColor: '#000', color: '#fff' }}>
                                                Source
                                            </div>
                                        </th>
                                        <th className="flex-1 px-6 py-3 flex justify-center" style={{ minWidth: '120px' }}>
                                            <div className='text-center text-base font-bold text-white bg-black rounded-lg' style={{ width: 100, padding: 10, borderRadius: 30, backgroundColor: '#000', color: '#fff' }}>
                                                Time
                                            </div>
                                        </th>
                                    </motion.tr>
                                </thead>
                                <AnimatePresence>
                                    {loading && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="p-4 text-center"
                                        >
                                            loading...
                                        </motion.div>
                                    )}
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="p-4 text-center text-red-500"
                                        >
                                            {error}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                <tbody>
                                    <AnimatePresence>
                                        {historyItems.map((item, index) => (
                                            <motion.tr 
                                                key={item.requestId}
                                                className="flex gap-4"
                                                style={{ width: '100%' }}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 20 }}
                                                transition={{ 
                                                    duration: 0.3,
                                                    delay: index * 0.05 // 错开动画
                                                }}
                                            >
                                                <td className="flex-1 px-6 py-4 text-center text-base" style={{ minWidth: '150px', color: isDark ? '#fff' : '#000' }}>
                                                    <motion.div
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                    >
                                                        {formatRequestId(item.requestId)}
                                                    </motion.div>
                                                </td>
                                                <td className="flex-1 px-6 py-4 text-center text-base" style={{ minWidth: '120px' }}>
                                                    <motion.div
                                                        whileHover={{ scale: 1.05 }}
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            padding: '6px 16px',
                                                            borderRadius: '999px',
                                                            fontWeight: 'bold',
                                                            fontSize: '14px',
                                                            minWidth: 100,
                                                            justifyContent: 'center',
                                                            background: item.status === 'In-Progress'
                                                                ? 'linear-gradient(90deg, #B06AB3, #FFA07A)'
                                                                : isDark ? '#1a1a1a' : '#efefef',
                                                            color: isDark 
                                                                ? item.status === 'In-Progress' ? '#fff' : '#fff' 
                                                                : '#000',
                                                        }}
                                                    >
                                                        {item.status !== 'In-Progress' && (
                                                            <motion.span
                                                                initial={{ scale: 0 }}
                                                                animate={{ scale: 1 }}
                                                                style={{
                                                                    width: '8px',
                                                                    height: '8px',
                                                                    borderRadius: '50%',
                                                                    backgroundColor: item.status === 'Done' ? '#00c853' : '#d50000',
                                                                    marginRight: '6px'
                                                                }}
                                                            />
                                                        )}
                                                        {item.status}
                                                    </motion.div>
                                                </td>
                                                <td className="flex-1 px-6 py-4 text-center text-base" style={{ minWidth: '120px' }}>
                                                    <motion.div 
                                                        whileHover={{ scale: 1.05 }}
                                                        style={{
                                                            display: 'inline-block',
                                                            padding: '4px 12px',
                                                            borderRadius: '4px',
                                                            backgroundColor: '#f0f0f0',
                                                            color: '#000',
                                                            fontSize: '14px'
                                                        }}
                                                    >
                                                        {item.model}
                                                    </motion.div>
                                                </td>
                                                <motion.td 
                                                    whileHover={{ scale: 1.05 }}
                                                    className="flex-1 px-6 py-4 text-center text-base" 
                                                    style={{ minWidth: '150px', color: isDark ? '#fff' : '#000' }}
                                                >
                                                    {item.tokenUsage}
                                                </motion.td>
                                                <motion.td 
                                                    whileHover={{ scale: 1.05 }}
                                                    className="flex-1 px-6 py-4 text-center text-base" 
                                                    style={{ minWidth: '120px', color: isDark ? '#fff' : '#000' }}
                                                >
                                                    {item.reward}
                                                </motion.td>
                                                <td className="flex-1 px-6 py-4 text-center text-base" style={{ minWidth: '120px' }}>
                                                    <motion.div 
                                                        whileHover={{ scale: 1.05 }}
                                                        style={{
                                                            display: 'inline-block',
                                                            padding: '4px 12px',
                                                            borderRadius: '4px',
                                                            backgroundColor: item.source === 'local' ? (isDark ? '#2d2d2d' : '#f0f0f0') : (isDark ? '#1a3a1a' : '#e6f7e6'),
                                                            color: item.source === 'local' ? (isDark ? '#fff' : '#000') : (isDark ? '#4caf50' : '#2e7d32'),
                                                            fontSize: '14px',
                                                            fontWeight: '500'
                                                        }}
                                                    >
                                                        {item.source === 'local' ? 'Local' : 'Gateway'}
                                                    </motion.div>
                                                </td>
                                                <motion.td 
                                                    whileHover={{ scale: 1.05 }}
                                                    className="flex-1 px-6 py-4 text-center text-base" 
                                                    style={{ minWidth: '120px', color: isDark ? '#fff' : '#000' }}
                                                >
                                                    {new Date(item.updated_at).toLocaleString('en-US', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                        hour12: false,
                                                    })}
                                                    <br />
                                                    {new Date(item.updated_at).toLocaleDateString('en-US', {
                                                        month: '2-digit',
                                                        day: '2-digit',
                                                        year: 'numeric'
                                                    })}
                                                </motion.td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                            <motion.div 
                                variants={fadeInUp}
                                style={{
                                    padding: '1rem',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    borderTop: `1px solid ${isDark ? '#333' : '#eee'}`
                                }}
                            >
                                <ConfigProvider
                                    theme={{
                                        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
                                        token: {
                                            colorText: isDark ? '#fff' : '#000',
                                            colorTextBase: isDark ? '#fff' : '#000',
                                            colorBgContainer: isDark ? '#1a1a1a' : '#fff',
                                            colorBorder: isDark ? '#333' : '#d9d9d9',
                                            colorPrimary: isDark ? '#fff' : '#000',
                                            colorPrimaryHover: isDark ? '#ccc' : '#333',
                                            colorPrimaryActive: isDark ? '#fff' : '#000',
                                            colorPrimaryText: isDark ? '#000' : '#fff',
                                        },
                                        components: {
                                            Pagination: {
                                                colorBgContainer: 'transparent',
                                                colorBgTextHover: isDark ? '#333' : '#f5f5f5',
                                                colorBgTextActive: isDark ? '#fff' : '#000',
                                                colorText: isDark ? '#fff' : '#000',
                                                colorPrimary: isDark ? '#fff' : '#000',
                                                colorTextDisabled: isDark ? '#666' : '#999',
                                            },
                                            Select: {
                                                colorBgContainer: isDark ? '#1a1a1a' : '#fff',
                                                colorBgElevated: isDark ? '#1a1a1a' : '#fff',
                                                colorText: isDark ? '#fff' : '#000',
                                                colorTextPlaceholder: isDark ? '#666' : '#999',
                                                controlItemBgActive: isDark ? '#333' : '#f5f5f5',
                                                controlItemBgHover: isDark ? '#333' : '#f5f5f5',
                                            }
                                        }
                                    }}
                                >
                                    <Pagination
                                        current={page}
                                        pageSize={pageSize}
                                        total={total}
                                        showSizeChanger
                                        pageSizeOptions={[10, 20, 50]}
                                        onChange={(page, size) => {
                                            setPage(page)
                                            setPageSize(size)
                                        }}
                                    />
                                </ConfigProvider>
                            </motion.div>
                        </motion.div>
                    </Card>
                </motion.div>
            </motion.main>
        </MainContent>
    )
}