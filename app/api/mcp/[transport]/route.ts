import { createMcpHandler } from "mcp-handler";
import { getMcpUser } from "@/lib/mcp/auth";
import { allTools } from "@/lib/mcp/tools";
import { isGersSlimUi } from "@/lib/gers";

function disabledResponse() {
  return new Response(JSON.stringify({ error: "MCP disabled in GERS slim build" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
}

const handler = createMcpHandler(
  (server) => {
    for (const tool of allTools) {
      server.tool(tool.name, tool.description, tool.schema.shape, async (args: Record<string, unknown>) => {
        try {
          const mcpUser = await getMcpUser();
          const result = await tool.handler(args as any, mcpUser.id);
          return {
            content: [{ type: "text" as const, text: JSON.stringify(result) }],
          };
        } catch (err: any) {
          const msg: string = err.message ?? "Unknown error";
          const code =
            msg === "NOT_FOUND" ? "NOT_FOUND"
            : msg === "Unauthorized" ? "UNAUTHORIZED"
            : msg.startsWith("CONFLICT:") ? "INVALID_REQUEST"
            : msg.startsWith("VALIDATION_ERROR:") ? "INVALID_PARAMS"
            : msg.startsWith("EXTERNAL_ERROR:") ? "INTERNAL_ERROR"
            : "INTERNAL_ERROR";
          return {
            content: [{ type: "text" as const, text: JSON.stringify({ error: msg, code }) }],
            isError: true,
          };
        }
      });
    }
  },
  {
    capabilities: { tools: {} },
  }
);

export function GET(
  req: Request,
  ctx: { params: Promise<{ transport: string }> }
) {
  if (isGersSlimUi()) return disabledResponse();
  return handler(req, ctx);
}

export function POST(
  req: Request,
  ctx: { params: Promise<{ transport: string }> }
) {
  if (isGersSlimUi()) return disabledResponse();
  return handler(req, ctx);
}
