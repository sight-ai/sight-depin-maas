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

    async getSummary(timeRange: 'daily' | 'weekly' | 'monthly' = 'daily', filter?: { year?: string; month?: string; view?: 'Month' | 'Year' }): Promise<SummaryResponse> {
        const queryString = new URLSearchParams({
            timeRange: JSON.stringify({ 
                request_serials: timeRange,
                filteredTaskActivity: filter || {}
            })
        }).toString();
        return request<SummaryResponse>(`/miner/summary?${queryString}`);
    },
    
    async sendDeviceStatus(data:any) {
        return request('/miner/deviceStatus', {method: 'POST', body:JSON.stringify(data)});
    },
    
    async getDeviceStatus() {
        return request('/miner/deviceStatus?deviceId=ollama-1', {method: 'GET'});
    }
};
