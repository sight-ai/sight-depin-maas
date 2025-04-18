export interface HistoryItem {
    status: 'In-Progress' | 'Done' | 'Failed';
    requestId: string;
    tokenUsage: string;
    reward: string;
    model: string;
    source: string;
    updated_at: string;
}

export interface Task {
    id: string;
    model: string;
    created_at: string;
    status: 'in-progress' | 'succeed' | 'failed' | 'running' | 'completed';
    total_duration: number;
    load_duration: number;
    prompt_eval_count: number;
    prompt_eval_duration: number;
    eval_count: number;
    eval_duration: number;
    updated_at: string;
    source: 'local' | 'gateway';
}

export interface HistoryResponse {
    page: number;
    limit: number;
    total: number;
    tasks: Task[];
}

export interface PaginationParams {
    page: number;
    limit: number;
}



export interface SummaryResponse {
    earning_info: {
        total_block_rewards: number;
        total_job_rewards: number;
    };
    device_info: {
        name: string;
        status: string;
    };
    statistics: {
        up_time_percentage: number;
        earning_serials: number[];
        task_activity: number[];
        request_serials: number[];
    };
}