import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/services/api';
import { NodeItem, NodeResponse } from '@/types/api';

export function useNode() {
    const [nodeItems, setNodeItems] = useState<NodeItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);

    const fetchNodes = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await apiService.getNodes({ page, limit: pageSize, status: 'connected' });
            console.log(response)
            setNodeItems(response.data.data);
            setTotal(response.data.total);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    }, [page, pageSize]);

    const refreshNodes = useCallback(async () => {
        setPage(1);
        await fetchNodes();
    }, [fetchNodes]);

    useEffect(() => {
        fetchNodes();
    }, [fetchNodes]);

    return {
        nodeItems,
        loading,
        error,
        refreshNodes,
        page,
        setPage,
        pageSize,
        setPageSize,
        total
    };
} 