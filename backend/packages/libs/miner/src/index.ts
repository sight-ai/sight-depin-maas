// =============================================================================
// 原有导出（向后兼容）
// =============================================================================
export * from './lib';
export * from './lib/miner.interface';
export * from './lib/miner.service';
export * from './lib/miner.repository';

// =============================================================================
// 新的契约架构导出 - 按业务功能组织
// =============================================================================

// 核心契约接口
export * from './lib/core-contracts/miner-core.contracts';

// 基础实现类
export * from './lib/base-implementations/base-task-manager';

// 具体实现服务
export * from './lib/services/task-manager.service';
export * from './lib/services/earnings-manager.service';
export * from './lib/services/data-access.service';
export * from './lib/services/unified-miner.service';
export * from './lib/services/task-aggregation.service';
export * from './lib/services/earnings-aggregation.service';

export { SaitoRuntime, createLocalRuntime } from './runtime';
