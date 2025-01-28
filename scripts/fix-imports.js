import { readdir, readFile, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, "../dist-server");

async function addJsExtensions(dir) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      await addJsExtensions(fullPath);
    } else if (entry.name.endsWith(".js")) {
      const content = await readFile(fullPath, "utf8");
      const newContent = content.replace(
        /from ['"]([^'"]+)['"]/g,
        (match, p1) => {
          if (p1.startsWith(".") && !p1.endsWith(".js")) {
            return `from '${p1}.js'`;
          }
          return match;
        }
      );
      await writeFile(fullPath, newContent);
    }
  }
}

addJsExtensions(distDir).catch(console.error);
