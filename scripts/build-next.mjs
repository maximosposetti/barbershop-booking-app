import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const env = {
  ...process.env,
  NEXT_DIST_DIR: ".next-build"
};

const generate = spawnSync("npx", ["prisma", "generate"], {
  env,
  shell: true,
  stdio: "inherit"
});

if (generate.status !== 0) {
  const generatedClientExists =
    existsSync("node_modules/.prisma/client/index.js") &&
    existsSync("node_modules/.prisma/client/query_engine-windows.dll.node");

  if (!generatedClientExists) {
    process.exit(generate.status ?? 1);
  }

  console.warn(
    "Prisma generate failed, but an existing generated client was found. Continuing local build."
  );
}

const build = spawnSync("npx", ["next", "build"], {
  env,
  shell: true,
  stdio: "inherit"
});

process.exit(build.status ?? 1);
