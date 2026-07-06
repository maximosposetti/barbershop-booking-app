import { rm } from "node:fs/promises";
import path from "node:path";

const targets = [path.join(process.cwd(), ".next"), path.join(process.cwd(), "node_modules", ".cache", "next")];

async function removeWithRetry(target) {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      await rm(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 250 });
      return;
    } catch (error) {
      if (attempt === 5) {
        console.warn(`No se pudo limpiar ${target}. Cierra el servidor de desarrollo y vuelve a intentar.`, error);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, attempt * 250));
    }
  }
}

for (const target of targets) {
  await removeWithRetry(target);
}
