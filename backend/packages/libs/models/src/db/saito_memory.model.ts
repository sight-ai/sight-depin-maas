import z from 'zod';

const MemoryMetadataSchema = z.object({
  owner: z.string(),
  category: z.string(),
  name: z.string(),
  sensitivity: z.string()
})

const MemoryMetadataCollectionSchema = z.array(MemoryMetadataSchema);

const MemorySchema = MemoryMetadataSchema.extend({
  content: z.string()
})

export const SaitoMemorySchema = {
  memory_metadata: MemoryMetadataSchema,
  memory: MemorySchema,
  memory_metadata_collection: MemoryMetadataCollectionSchema
} as const;

export type MemoryMetadata = z.infer<typeof MemoryMetadataSchema>;
export type Memory = z.infer<typeof MemorySchema>;
export type MemoryMetadataCollection = z.infer<typeof MemoryMetadataSchema>;
