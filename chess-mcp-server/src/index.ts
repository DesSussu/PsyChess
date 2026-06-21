import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readdir, readFile } from "fs/promises";
import { join, extname, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

let cachedContent: string | null = null;

async function loadBooks(): Promise<string> {
  if (cachedContent !== null) return cachedContent;
  const dir = join(__dirname, "../../chess-books");
  let content = "";
  try {
    const files = await readdir(dir);
    for (const file of files) {
      if ([".txt", ".pgn", ".md"].includes(extname(file).toLowerCase())) {
        const text = await readFile(join(dir, file), "utf-8");
        content += `\n\n=== ${file} ===\n${text}`;
      }
    }
  } catch { /* no books dir */ }
  cachedContent = content;
  return content;
}

const server = new McpServer({
  name: "chess-books-mcp",
  version: "1.0.0",
});

server.tool(
  "search_chess_knowledge",
  { query: z.string().describe("Chess concept, opening, or position to search in books") },
  async ({ query }) => {
    const content = await loadBooks();
    if (!content) {
      return { content: [{ type: "text", text: "No chess books loaded. Add .txt or .pgn files to the chess-books/ directory." }] };
    }
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const paragraphs = content.split(/\n{2,}/);
    const relevant = paragraphs
      .filter(p => words.some(w => p.toLowerCase().includes(w)))
      .slice(0, 5)
      .join("\n\n---\n\n");
    return {
      content: [{ type: "text", text: relevant || "No relevant content found for that query." }],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
