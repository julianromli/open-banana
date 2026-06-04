import { readFileSync, writeFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const workerPath = join(dirname(fileURLToPath(import.meta.url)), "..", ".open-next", "worker.js")
let source = readFileSync(workerPath, "utf8")

const target = "const reqOrResp = await middlewareHandler(request, env, ctx);"
const replacement = "// Passthrough: OpenNext middleware bundle dynamic-require fails on workerd\n            const reqOrResp = request;"

if (!source.includes(target)) {
  if (source.includes(replacement)) {
    console.log("worker.js already patched (skip middleware)")
    process.exit(0)
  }
  console.error("patch-worker-skip-middleware: expected snippet not found in worker.js")
  process.exit(1)
}

source = source.replace(target, replacement)
writeFileSync(workerPath, source)
console.log("Patched worker.js to skip middleware handler")
