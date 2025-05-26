import { createEnv } from '@t3-oss/env-core';
import memoizee from 'memoizee';
import { z } from 'zod';
import path from 'path';
import os from 'os';
import fs from 'fs';

export const env = memoizee(() =>
  createEnv({
    server: {
      // Keep for backward compatibility
      NODE_DATABASE_URL: z.string().optional(),
      // New SQLite database path - stored in user's home directory under .sightai or Docker data directory
      SQLITE_DATABASE_PATH: z.string().default(() => {
        // 在 Docker 环境中，优先使用 SIGHTAI_DATA_DIR 环境变量
        const dataDir = process.env['SIGHTAI_DATA_DIR'];

        let sightaiDir: string;
        if (dataDir) {
          // Docker 环境：使用数据卷目录
          sightaiDir = dataDir;
        } else {
          // 本地环境：使用用户主目录
          const homeDir = os.homedir();
          sightaiDir = path.join(homeDir, '.sightai');
        }

        // 确保目录存在
        try {
          if (!fs.existsSync(sightaiDir)) {
            fs.mkdirSync(sightaiDir, { recursive: true });
          }
        } catch (error) {
          console.warn(`Failed to create directory ${sightaiDir}:`, error);
        }
        // 返回数据库文件的完整路径
        return path.join(sightaiDir, 'saito.db');
      }),
    },
    runtimeEnv: process.env,
  }),
);
