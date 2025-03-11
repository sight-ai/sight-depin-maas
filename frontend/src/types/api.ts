export interface HistoryItem {
    status: 'In-Progress' | 'Done' | 'Failed';
    requestId: string;
    tokenUsage: string;
    reward: string;
}

export interface Task {
    id: string;
    model: string;
    created_at: string;
    status: 'in-progress' | 'done' | 'failed';
    total_duration: number;
    load_duration: number;
    prompt_eval_count: number;
    prompt_eval_duration: number;
    eval_count: number;
    eval_duration: number;
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
