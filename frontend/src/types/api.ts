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

export interface SummaryItem {
    date: string;
    value: number;
}

export interface NodeItem {
    id: string;
    task_name: string;
    owner_address: string;
    node_id: string;
    status: string;
    one_time_code: string;
    device_type: string | null;
    gpu_type: string | null;
    current_ai_model?: string;
    connected_gateway?: string;
    total_earnings?: number;
    pending_earnings?: number;
    memory_usage?: number;
}

export interface NodeResponse {
    data: {
        data: Array<NodeItem>,
        total:  number
    }
  
}