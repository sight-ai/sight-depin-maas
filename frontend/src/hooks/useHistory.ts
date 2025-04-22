'use client'

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/services/api';
import type { HistoryItem } from '@/types/api';

export function useHistory() {
    const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);

    const fetchHistory = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await apiService.getHistory({ page, limit: pageSize });
            // 转换响应数据格式
            const items: HistoryItem[] = response.tasks.map(task => ({
                status: (task.status === 'pending' || task.status === 'running') ? 'In-Progress' :
                    (task.status === 'completed') ? 'Done' : 'Failed',
                requestId: task.id,
                tokenUsage: `${task.prompt_eval_count + task.eval_count}`,
                reward: `$${((task.total_duration || 0) * 0.1).toFixed(2)}`,
                model: task.model,
                source: task.source,
                updated_at: task.updated_at
            }));
            setHistoryItems(items);
            setTotal(response.total);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    }, [page, pageSize]);

    const refreshHistory = useCallback(async () => {
        setPage(1);
        try {
            setLoading(true);
            setError(null);
            const response = await apiService.refreshHistory({ page: 1, limit: pageSize });
            setHistoryItems(response.tasks.map(task => ({
                status: task.status === 'pending' ? 'In-Progress' :
                    (task.status === 'completed') ? 'Done' : 'Failed',
                requestId: task.id,
                tokenUsage: `${task.prompt_eval_count + task.eval_count}`,
                reward: `$${((task.total_duration || 0) * 0.1).toFixed(2)}`,
                model: task.model,
                source: task.source,
                updated_at: task.updated_at
            })));
            setTotal(response.total);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    }, [pageSize]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    return {
        historyItems,
        loading,
        error,
        refreshHistory,
        page,
        setPage,
        pageSize,
        setPageSize,
        total
    };
}