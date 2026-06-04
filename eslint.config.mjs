import nextCoreWebVitals from "eslint-config-next/core-web-vitals"
import { defineConfig, globalIgnores } from "eslint/config"

export default defineConfig([
  globalIgnores([".open-next/**", ".wrangler/**"]),
  ...nextCoreWebVitals,
])
