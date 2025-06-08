// =============================================================================
// 原有导出（向后兼容）
// =============================================================================
export * from './lib';
export * from './lib/miner.interface';
export * from './lib/miner.service';
export * from './lib/miner.repository';

// =============================================================================
// 新的抽象架构导出
// =============================================================================

// 核心抽象接口
export * from './lib/abstracts/miner-core.interface';

// 抽象基类
export * from './lib/abstracts/base-task-manager';
export * from './lib/abstracts/base-earnings-manager';
export * from './lib/abstracts/base-statistics-analyzer';
export * from './lib/abstracts/base-data-access';

// 具体实现服务
export * from './lib/services/task-manager.service';
export * from './lib/services/earnings-manager.service';
export * from './lib/services/data-access.service';
export * from './lib/services/unified-miner.service';

export { SaitoRuntime, createLocalRuntime } from './runtime';
