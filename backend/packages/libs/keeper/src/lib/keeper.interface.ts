import { Memory } from "@saito/models";

export interface RetrieveMemoryResult {
  status: string; // 'succeeded' | 'failed' | 'partial'
  items: {
    id: string;
    content?: string; // Only populated if authorized
    message?: string; // Only populated if unauthorized
  }[];
}

export interface AuthorizeMemoryResult {
  requester: string;
  memory_id: string;
  is_authorized: boolean;
}

export abstract class MemoryKeeperPipeline {
  abstract extractMemory(input: string): Promise<Memory>;
  abstract retrieveMemory(input: string, requesterId: string): Promise<RetrieveMemoryResult>;
  abstract authorizeMemory(id: string, requesterId: string, signature?: string) :Promise<AuthorizeMemoryResult>;
}
