'use client'

import { Card } from '@nextui-org/react'
import { Header } from '@/components/Header'
import { MainContent } from '@/components/MainContent'
import { useThemeCus } from '@/hooks/useTheme'
import { Button, Pagination, Select, Tooltip } from 'antd'
import { useState } from 'react'
import { ConfigProvider, theme } from 'antd'
import { motion, AnimatePresence } from 'framer-motion'
import { PlusOutlined, SyncOutlined } from '@ant-design/icons'
import { useNode } from '@/hooks/useNode'
import { useRouter } from 'next/navigation'

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

export default function NodePage() {
    const { isDark } = useThemeCus()
    const router = useRouter()
    const { nodeItems, loading, error, page, setPage, pageSize, setPageSize, total, refreshNodes } = useNode()

    const formatDeviceId = (deviceId: string) => {
        if (deviceId.length <= 8) return deviceId;
        return `${deviceId.slice(0, 4)}...${deviceId.slice(-4)}`;
    }

    const handleConnectNewDevice = () => {
        window.open('https://sightai.io/model/gateway', '_blank')
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
                    <Header />
                </motion.div>
                <motion.div 
                    variants={fadeInUp}
                    style={{
                        fontWeight: 800,
                        fontSize: '3.125em',
                        color: isDark ? '#fff' : '#000',
                    }}
                >
                    Node Management
                </motion.div>

                <motion.div variants={fadeInUp}>
                    <div className="flex justify-between items-center mb-6">
                        <div className="text-xl font-medium" style={{ color: isDark ? '#fff' : '#000' }}>
                            Node Management Overview
                        </div>
                        <div className="flex gap-4">
                            <Button 
                                type="primary"
                                icon={<SyncOutlined />}
                                style={{
                                    backgroundColor: isDark ? '#333' : '#f0f0f0',
                                    borderColor: 'transparent',
                                    color: isDark ? '#fff' : '#000'
                                }}
                                onClick={refreshNodes}
                            >
                                Refresh
                            </Button>
                            <Button 
                                type="primary"
                                icon={<PlusOutlined />}
                                style={{
                                    backgroundColor: '#000',
                                    color: '#fff'
                                }}
                                onClick={handleConnectNewDevice}
                            >
                                Connect New Device
                            </Button>
                        </div>
                    </div>

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
                                        {[
                                            { title: 'Device ID', width: 150 },
                                            { title: 'Device Name', width: 150 },
                                            { title: 'Device Type', width: 200 },
                                            { title: 'Status', width: 120 },
                                            { title: 'Current AI Model', width: 150 },
                                            { title: 'Connected Gateway', width: 230 },
                                            { title: 'Total Earning', width: 120 },
                                            { title: 'Pending Earnings', width: 150 },
                                            { title: 'Memory Usage', width: 150 }
                                        ].map((header) => (
                                            <th key={header.title} className="flex-1 px-6 py-3 flex justify-center" style={{ minWidth: `${header.width}px` }}>
                                                <div className='text-center text-base font-bold text-white bg-black rounded-lg' 
                                                    style={{ 
                                                        width: header.width, 
                                                        padding: 10, 
                                                        borderRadius: 30, 
                                                        backgroundColor: '#000', 
                                                        color: '#fff' 
                                                    }}
                                                >
                                                    {header.title}
                                                </div>
                                            </th>
                                        ))}
                                    </motion.tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={9} className="text-center p-4" style={{ color: isDark ? '#fff' : '#000' }}>
                                                <motion.span
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                >
                                                    Loading...
                                                </motion.span>
                                            </td>
                                        </tr>
                                    ) : error ? (
                                        <tr>
                                            <td colSpan={9} className="text-center p-4 text-red-500">
                                                <motion.span
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                >
                                                    {error}
                                                </motion.span>
                                            </td>
                                        </tr>
                                    ) : (
                                        <AnimatePresence>
                                            {nodeItems.map((device, index) => (
                                                <motion.tr 
                                                    key={device.id}
                                                    className="flex gap-4"
                                                    style={{ width: '100%' }}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: 20 }}
                                                    transition={{ 
                                                        duration: 0.3,
                                                        delay: index * 0.05
                                                    }}
                                                >
                                                    <td className="flex-1 px-6 py-4 text-center text-base" style={{ minWidth: '150px', color: isDark ? '#fff' : '#000' }}>
                                                        <motion.div whileHover={{ scale: 1.05 }}>
                                                            {formatDeviceId(device.node_id)}
                                                        </motion.div>
                                                    </td>
                                                    <td className="flex-1 px-6 py-4 text-center text-base" style={{ minWidth: '150px', color: isDark ? '#fff' : '#000' }}>
                                                        <motion.div whileHover={{ scale: 1.05 }}>
                                                            {device.task_name}
                                                        </motion.div>
                                                    </td>
                                                    <td className="flex-1 px-6 py-4 text-center text-base  flex justify-center" style={{ minWidth: '200px' }}>
                                                        <motion.div 
                                                            whileHover={{ scale: 1.05 }}
                                                            style={{
                                                                display: 'inline-block',
                                                                padding: '4px 12px',
                                                                borderRadius: '4px',
                                                                backgroundColor: isDark ? '#2d2d2d' : '#f0f0f0',
                                                                color: isDark ? '#fff' : '#000',
                                                                fontSize: '14px'
                                                            }}
                                                        >
                                                            {device.device_type || 'Unknown'}
                                                        </motion.div>
                                                    </td>
                                                    <td className="flex-1 px-6 py-4 text-center text-base  flex justify-center" style={{ minWidth: '120px' }}>
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
                                                                background: 
                                                                    isDark ? '#1a1a1a' : '#efefef',
                                                                color: isDark ? '#fff' : '#000',
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    width: '8px',
                                                                    height: '8px',
                                                                    borderRadius: '50%',
                                                                    backgroundColor: device.status === 'connected' ? '#00c853' : '#d50000',
                                                                    marginRight: '6px',
                                                                    textAlign: 'center'
                                                                }}
                                                            />
                                                            {device.status}
                                                        </motion.div>
                                                    </td>
                                                    <td className="flex-1 px-6 py-4 text-center text-base flex justify-center" style={{ minWidth: '150px' }}>
                                                        <motion.div 
                                                            whileHover={{ scale: 1.05 }}
                                                            style={{
                                                                display: 'inline-block',
                                                                padding: '4px 12px',
                                                                borderRadius: '4px',
                                                                backgroundColor: isDark ? '#2d2d2d' : '#f0f0f0',
                                                                color: isDark ? '#fff' : '#000',
                                                                fontSize: '14px'
                                                            }}
                                                        >
                                                            {device.current_ai_model || 'N/A'}
                                                        </motion.div>
                                                    </td>
                                                    <td className="flex-1 px-6 py-4 text-center text-base" style={{ minWidth: '150px', color: isDark ? '#fff' : '#000' }}>
                                                        <motion.div whileHover={{ scale: 1.05 }}>
                                                            {device.connected_gateway || 'N/A'}
                                                        </motion.div>
                                                    </td>
                                                    <td className="flex-1 px-6 py-4 text-center text-base" style={{ minWidth: '120px', color: isDark ? '#fff' : '#000' }}>
                                                        <motion.div whileHover={{ scale: 1.05 }}>
                                                            ${device.total_earnings?.toFixed(2) || '0.00'}
                                                        </motion.div>
                                                    </td>
                                                    <td className="flex-1 px-6 py-4 text-center text-base" style={{ minWidth: '150px', color: isDark ? '#fff' : '#000' }}>
                                                        <motion.div whileHover={{ scale: 1.05 }}>
                                                            ${device.pending_earnings?.toFixed(2) || '0.00'}
                                                        </motion.div>
                                                    </td>
                                                    <td className="flex-1 px-6 py-4 text-center text-base" style={{ minWidth: '150px' }}>
                                                        <motion.div 
                                                            whileHover={{ scale: 1.05 }}
                                                            style={{
                                                                width: '100%',
                                                                height: '8px',
                                                                backgroundColor: isDark ? '#333' : '#f0f0f0',
                                                                borderRadius: '4px',
                                                                overflow: 'hidden'
                                                            }}
                                                        >
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${device.memory_usage || 0}%` }}
                                                                transition={{ duration: 1, ease: "easeOut" }}
                                                                style={{
                                                                    height: '100%',
                                                                    backgroundColor: (device.memory_usage || 0) > 80 ? '#ff4d4f' : '#00c853',
                                                                    borderRadius: '4px'
                                                                }}
                                                            />
                                                        </motion.div>
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </AnimatePresence>
                                    )}
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