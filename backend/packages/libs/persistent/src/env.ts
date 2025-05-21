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
      // New SQLite database path - stored in user's home directory under .sightai
      SQLITE_DATABASE_PATH: z.string().default(() => {
        // 获取用户主目录
        const homeDir = os.homedir();
        // 创建.sightai目录路径
        const sightaiDir = path.join(homeDir, '.sightai');
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
