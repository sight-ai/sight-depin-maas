import { request } from '@/utils/request';
import type { HistoryResponse, PaginationParams, SummaryResponse} from '@/types/api';


export const apiService = {
    async getHistory(params: PaginationParams): Promise<HistoryResponse> {
        const queryString = new URLSearchParams({
            page: params.page.toString(),
            limit: params.limit.toString()
        }).toString();
        return request<HistoryResponse>(`/miner/history?${queryString}`);
    },

    async refreshHistory(params: PaginationParams): Promise<HistoryResponse> {
        const queryString = new URLSearchParams({
            page: params.page.toString(),
            limit: params.limit.toString()
        }).toString();
        return request<HistoryResponse>(`/miner/history?${queryString}`);
    },

    async getSummary(): Promise<SummaryResponse> {
        return request<SummaryResponse>('/miner/summary');
    }
};
