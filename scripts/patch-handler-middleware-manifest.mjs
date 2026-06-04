import { readFileSync, writeFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const handlerPath = join(root, ".open-next", "server-functions", "default", "handler.mjs")
const manifestPath = join(root, ".next", "server", "middleware-manifest.json")

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))
const inlineManifest = JSON.stringify(manifest)

const target =
  "getMiddlewareManifest(){return this.minimalMode?null:require(this.middlewareManifestPath)}"
const replacement = `getMiddlewareManifest(){return this.minimalMode?null:${inlineManifest}}`

let source = readFileSync(handlerPath, "utf8")

if (!source.includes(target)) {
  if (source.includes("getMiddlewareManifest(){return this.minimalMode?null:{")) {
    console.log("handler.mjs already patched (middleware manifest)")
    process.exit(0)
  }
  console.error(
    "patch-handler-middleware-manifest: expected getMiddlewareManifest snippet not found"
  )
  process.exit(1)
}

source = source.replace(target, replacement)
writeFileSync(handlerPath, source)
console.log("Patched handler.mjs with inlined middleware manifest")
