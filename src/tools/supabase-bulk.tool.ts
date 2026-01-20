import { z } from "zod";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { ToolDefinition } from "../types/index.js";
import { getEnvVariable } from "../utils/env.js";

/**
 * Create Supabase client with service role key for backend operations
 */
function getSupabaseClient(): SupabaseClient {
  const supabaseUrl = getEnvVariable("SUPABASE_URL", true)!;
  const supabaseServiceKey = getEnvVariable("SUPABASE_SERVICE_ROLE_KEY", true)!;

  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Schema for the insert command
 */
const insertSchema = z.object({
  command: z.literal("insert"),
  table: z.string().min(1).describe("The table name to insert into"),
  records: z
    .array(z.record(z.unknown()))
    .min(1)
    .describe("Array of records to insert"),
});

/**
 * Schema for join table configuration
 */
const joinConfigSchema = z.object({
  table: z.string().min(1).describe("The join table name"),
  src: z.string().min(1).describe("Column name for source foreign key"),
  dst: z.string().min(1).describe("Column name for destination foreign key"),
});

/**
 * Schema for lookup table configuration
 */
const lookupConfigSchema = z.object({
  table: z.string().min(1).describe("The table to look up IDs from"),
  column: z.string().min(1).describe("The column to match values against"),
});

/**
 * Schema for src/dst value pairs
 */
const pairSchema = z.object({
  src: z.string().describe("Source value to look up"),
  dst: z.string().describe("Destination value to look up"),
});

/**
 * Schema for the insert_join command
 */
const insertJoinSchema = z.object({
  command: z.literal("insert_join"),
  join: joinConfigSchema.describe("Join table configuration"),
  src: lookupConfigSchema.describe("Source table lookup configuration"),
  dst: lookupConfigSchema.describe("Destination table lookup configuration"),
  pairs: z.array(pairSchema).min(1).describe("Array of src/dst value pairs"),
});

/**
 * Combined input schema using discriminated union
 */
const inputSchema = z.discriminatedUnion("command", [
  insertSchema,
  insertJoinSchema,
]);

type InsertArgs = z.infer<typeof insertSchema>;
type InsertJoinArgs = z.infer<typeof insertJoinSchema>;

/**
 * Handle the insert command
 */
async function handleInsert(
  supabase: SupabaseClient,
  args: InsertArgs
): Promise<{ success: boolean; message: string; count?: number }> {
  const { table, records } = args;

  const { data, error } = await supabase.from(table).insert(records).select();

  if (error) {
    return {
      success: false,
      message: `Insert failed: ${error.message}`,
    };
  }

  return {
    success: true,
    message: `Successfully inserted ${data?.length ?? records.length} records into "${table}"`,
    count: data?.length ?? records.length,
  };
}

/**
 * Handle the insert_join command
 */
async function handleInsertJoin(
  supabase: SupabaseClient,
  args: InsertJoinArgs
): Promise<{ success: boolean; message: string; count?: number }> {
  const { join, src, dst, pairs } = args;

  // Collect unique values for batch lookups
  const srcValues = [...new Set(pairs.map((p) => p.src))];
  const dstValues = [...new Set(pairs.map((p) => p.dst))];

  // Batch lookup source IDs using select('*') to avoid dynamic column typing issues
  const { data: srcData, error: srcError } = await supabase
    .from(src.table)
    .select("*")
    .in(src.column, srcValues);

  if (srcError) {
    return {
      success: false,
      message: `Failed to lookup source values from "${src.table}": ${srcError.message}`,
    };
  }

  // Batch lookup destination IDs
  const { data: dstData, error: dstError } = await supabase
    .from(dst.table)
    .select("*")
    .in(dst.column, dstValues);

  if (dstError) {
    return {
      success: false,
      message: `Failed to lookup destination values from "${dst.table}": ${dstError.message}`,
    };
  }

  // Build lookup maps
  const srcMap = new Map<string, string>();
  for (const row of (srcData || []) as unknown as Array<
    Record<string, unknown>
  >) {
    srcMap.set(String(row[src.column]), String(row.id));
  }

  const dstMap = new Map<string, string>();
  for (const row of (dstData || []) as unknown as Array<
    Record<string, unknown>
  >) {
    dstMap.set(String(row[dst.column]), String(row.id));
  }

  // Build join records, tracking any missing lookups
  const joinRecords: Array<Record<string, string>> = [];
  const missingLookups: string[] = [];

  for (const pair of pairs) {
    const srcId = srcMap.get(pair.src);
    const dstId = dstMap.get(pair.dst);

    if (!srcId) {
      missingLookups.push(
        `Source "${pair.src}" not found in ${src.table}.${src.column}`
      );
      continue;
    }

    if (!dstId) {
      missingLookups.push(
        `Destination "${pair.dst}" not found in ${dst.table}.${dst.column}`
      );
      continue;
    }

    joinRecords.push({
      [join.src]: srcId,
      [join.dst]: dstId,
    });
  }

  if (joinRecords.length === 0) {
    return {
      success: false,
      message: `No valid pairs to insert. Missing lookups:\n${missingLookups.join("\n")}`,
    };
  }

  // Insert join records
  const { data: insertData, error: insertError } = await supabase
    .from(join.table)
    .insert(joinRecords)
    .select();

  if (insertError) {
    return {
      success: false,
      message: `Insert into join table "${join.table}" failed: ${insertError.message}`,
    };
  }

  let message = `Successfully inserted ${insertData?.length ?? joinRecords.length} records into "${join.table}"`;

  if (missingLookups.length > 0) {
    message += `\n\nWarning: ${missingLookups.length} pairs skipped due to missing lookups:\n${missingLookups.join("\n")}`;
  }

  return {
    success: true,
    message,
    count: insertData?.length ?? joinRecords.length,
  };
}

/**
 * Supabase Bulk Tool
 * Performs bulk insert operations using the Supabase JavaScript client
 */
export const supabaseBulkTool: ToolDefinition = {
  name: "supabase_bulk",
  description: `Perform bulk database operations on Supabase. Supports two commands:

1. "insert" - Bulk insert records into a table
   Required: command="insert", table (string), records (array of objects)

2. "insert_join" - Insert join table records by looking up IDs from related tables
   Required: command="insert_join", join (table config), src (lookup config), dst (lookup config), pairs (array of {src, dst} values)`,

  inputSchema,

  handler: async (args) => {
    try {
      const supabase = getSupabaseClient();

      let result: { success: boolean; message: string; count?: number };

      if (args.command === "insert") {
        result = await handleInsert(supabase, args as InsertArgs);
      } else if (args.command === "insert_join") {
        result = await handleInsertJoin(supabase, args as InsertJoinArgs);
      } else {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error: Unknown command "${(args as { command: string }).command}". Supported commands: insert, insert_join`,
            },
          ],
        };
      }

      if (!result.success) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error: ${result.message}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: result.message,
          },
        ],
      };
    } catch (error) {
      // Handle missing environment variable errors
      if (error instanceof Error) {
        if (error.message.includes("SUPABASE_URL")) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: "Error: SUPABASE_URL environment variable not set. Please add it to your .env or .env.local file.",
              },
            ],
          };
        }
        if (error.message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: "Error: SUPABASE_SERVICE_ROLE_KEY environment variable not set. Please add it to your .env or .env.local file.",
              },
            ],
          };
        }
      }

      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`,
          },
        ],
      };
    }
  },
};
