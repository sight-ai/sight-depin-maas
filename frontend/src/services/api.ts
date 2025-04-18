import { request } from '@/utils/request';
import type { HistoryResponse, PaginationParams, SummaryResponse, NodeResponse } from '@/types/api';


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
        // Create a properly formatted timeRange object
        const timeRangeObj = { 
            request_serials: timeRange,
            filteredTaskActivity: filter || {}
        };
        
        // Only include month if view is 'Month'
        if (filter?.view !== 'Month' && timeRangeObj.filteredTaskActivity.month) {
            delete timeRangeObj.filteredTaskActivity.month;
        }
        
        const queryString = new URLSearchParams({
            timeRange: JSON.stringify(timeRangeObj)
        }).toString();
        
        return request<SummaryResponse>(`/miner/summary?${queryString}`);
    },
    
    async getDeviceStatus(deviceId: string) {
        return request(`/miner/deviceStatus?deviceId=${deviceId}`, {method: 'GET'});
    },

    async getCurrentDevice() {
        return request<{ 
            deviceId: string, 
            rewardAddress: string | null,
            status: 'online' | 'offline'
        }>('/miner/currentDevice', {method: 'GET'});
    },

    async getGatewayStatus() {
        return request<{ isRegistered: boolean }>('/device-status/gateway-status', {method: 'GET'});
    },

    async getNodes(params: PaginationParams & { status: string }): Promise<NodeResponse> {
        const queryString = new URLSearchParams({
            page: params.page.toString(),
            pageSize: params.limit.toString(),
            status: params.status
        }).toString();
        return request<NodeResponse>(`/miner/connect-task-list?${queryString}`);
    }
};
