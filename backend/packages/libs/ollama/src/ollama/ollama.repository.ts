import { Inject } from "@nestjs/common"; 
import { PersistentService } from "@saito/persistent";
import { DatabaseTransactionConnection } from "slonik";
import { SQL } from "@saito/common";
import { z } from "zod";
import { m } from "@saito/models";

export class OllamaRepository {
  constructor(
    @Inject(PersistentService)
    private readonly persistentService: PersistentService,
  ) { }

  async transaction<T>(handler: (conn: DatabaseTransactionConnection) => Promise<T>) {
    return this.persistentService.pgPool.transaction(handler);
  }

  async updateChatRecord(
    conn: DatabaseTransactionConnection,
    chatId: string,
    userId: string,
    userInput: string,
    aiResponse: string,
    status: "active" | "archived",
    task_id: string
  ) {
    const now = new Date().toISOString();
    return conn.query(SQL.type(m.ollama('UpdateChatRecordSchema'))`
      WITH latest AS (
        SELECT * 
        FROM saito_miner.chat_records
        WHERE id = ${chatId}
        ORDER BY created_at DESC
        LIMIT 1
      ),
      updated AS (
        UPDATE saito_miner.chat_records
        SET user_input = ${userInput}, ai_response = ${aiResponse}, status = ${status}, updated_at = ${now}, task_id = ${task_id}
        WHERE id = ${chatId}
        RETURNING *
      )
      INSERT INTO saito_miner.chat_records (id, user_id, user_input, ai_response, created_at, updated_at, status, task_id)
      SELECT COALESCE(${chatId}, 'default_chat_id'), 
             COALESCE(${userId}, 'default_user_id'), 
             COALESCE(${userInput}, 'default_input'), 
             COALESCE(${aiResponse}, 'default_response'), 
             ${now}, ${now}, ${status} , ${task_id}
      WHERE NOT EXISTS (SELECT 1 FROM updated);
    `);
  }
  async findChatRecord(conn: DatabaseTransactionConnection, chatId: string): Promise<{
    userId: string,
    userInput: string,
    aiResponse: string,
    status: "active" | "archived",
  } | null> {
    const result = await conn.maybeOne(SQL.type(m.ollama('FindChatRecordSchema'))`
      SELECT user_id, user_input, ai_response, status
      FROM saito_miner.chat_records
      WHERE id = ${chatId};
    `);
    return result;
  }
}
