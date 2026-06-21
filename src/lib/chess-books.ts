import { readdir, readFile } from "fs/promises";
import { join, extname } from "path";

let cachedContent: string | null = null;

async function loadBooks(): Promise<string> {
  if (cachedContent !== null) return cachedContent;
  const dir = join(process.cwd(), "chess-books");
  let content = "";
  try {
    const files = await readdir(dir);
    for (const file of files) {
      if ([".txt", ".pgn", ".md"].includes(extname(file).toLowerCase())) {
        const text = await readFile(join(dir, file), "utf-8");
        content += `\n\n=== ${file} ===\n${text}`;
      }
    }
  } catch { /* chess-books dir doesn't exist yet */ }
  cachedContent = content;
  return content;
}

export async function searchChessBooks(query: string): Promise<string> {
  const content = await loadBooks();
  if (!content) return "";
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const paragraphs = content.split(/\n{2,}/);
  const relevant = paragraphs
    .filter(p => words.some(w => p.toLowerCase().includes(w)))
    .slice(0, 5)
    .join("\n\n---\n\n");
  return relevant;
}
