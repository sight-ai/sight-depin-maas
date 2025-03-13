'use client'

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/services/api';
import type { HistoryItem } from '@/types/api';

export function useHistory() {
    const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const limit = 10;

    const fetchHistory = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await apiService.getHistory({ page, limit });
            console.log(response)
            // 转换响应数据格式
            const items: HistoryItem[] = response.tasks.map(task => ({
                status: task.status === 'in-progress' ? 'In-Progress' :
                    task.status === 'succeed' ? 'Done' : 'Failed',
                requestId: task.id,
                tokenUsage: `${task.prompt_eval_count + task.eval_count}`,
                reward: `$${((task.total_duration || 0) * 0.1).toFixed(2)}`
            }));
            console.log(items)
            setHistoryItems(items);
        } catch (err) {
            // setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [page]);

    const refreshHistory = useCallback(async () => {
        setPage(1);
        try {
            setLoading(true);
            setError(null);
            const response = await apiService.refreshHistory({ page: 1, limit });
            setHistoryItems(response.tasks.map(task => ({
                status: task.status === 'in-progress' ? 'In-Progress' :
                    task.status === 'succeed' ? 'Done' : 'Failed',
                requestId: task.id,
                tokenUsage: `${task.prompt_eval_count + task.eval_count}`,
                reward: `$${((task.total_duration || 0) * 0.1).toFixed(2)}`
            })));
        } catch (err) {
            // setError(err.message)
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    return {
        historyItems,
        loading,
        error,
        refreshHistory,
        page,
        setPage
    };
}