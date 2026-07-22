import { spawnSync } from "node:child_process";

const start = spawnSync("npx", ["next", "start"], {
  env: {
    ...process.env,
    NEXT_DIST_DIR: ".next-build"
  },
  shell: true,
  stdio: "inherit"
});

process.exit(start.status ?? 1);
