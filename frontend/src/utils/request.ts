import { API_CONFIG } from '@/config/api'

interface RequestOptions extends RequestInit {
    timeout?: number;
    query?: Record<string, string>;
    data?: Record<string, any>;
}

export class RequestError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }
}

export async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
    const timeout = options.timeout || API_CONFIG.TIMEOUT;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${url}`, {
            ...options,
            headers: {
                ...API_CONFIG.HEADERS,
                ...options.headers,
            },
            signal: controller.signal
        });

        clearTimeout(id);

        if (!response.ok) {
            throw new RequestError(response.statusText, response.status);
        }

        return response.json();
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}
