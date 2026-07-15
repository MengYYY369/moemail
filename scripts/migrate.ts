import { readFileSync } from "fs"
import { exec } from "child_process"
import { promisify } from "util"
import { join } from "path"

const execAsync = promisify(exec)

interface D1Database {
  binding: string
  database_name: string
  database_id: string
}

interface WranglerConfig {
  d1_databases: D1Database[]
}

async function migrate() {
  try {
    const args = process.argv.slice(2)
    const mode = args[0]

    if (!mode || !["local", "remote"].includes(mode)) {
      console.error("Error: Please specify mode (local or remote)")
      process.exit(1)
    }

    const wranglerPath = join(process.cwd(), "wrangler.json")
    let wranglerContent: string
    try {
      wranglerContent = readFileSync(wranglerPath, "utf-8")
    } catch {
      console.error("Error: wrangler.json not found")
      process.exit(1)
    }

    const config = JSON.parse(wranglerContent) as WranglerConfig
    if (!config.d1_databases?.[0]?.database_name) {
      console.error("Error: Database name not found in wrangler.json")
      process.exit(1)
    }

    const dbName = config.d1_databases[0].database_name
    const dbId = config.d1_databases[0].database_id
    console.log("DB", dbName, dbId)
    console.log("CF account set", !!process.env.CLOUDFLARE_ACCOUNT_ID, "token set", !!process.env.CLOUDFLARE_API_TOKEN)

    console.log("Generating migrations...")
    await execAsync("drizzle-kit generate", { env: process.env })

    console.log(`Applying migrations to ${mode} database: ${dbName}`)
    const cmd = `pnpm exec wrangler d1 migrations apply ${dbName} --${mode}`
    try {
      const { stdout, stderr } = await execAsync(cmd, {
        env: process.env,
        maxBuffer: 10 * 1024 * 1024,
      })
      if (stdout) console.log(stdout)
      if (stderr) console.error(stderr)
    } catch (error: any) {
      if (error.stdout) console.log(error.stdout)
      if (error.stderr) console.error(error.stderr)
      throw error
    }

    console.log("Migration completed successfully!")
  } catch (error) {
    console.error("Migration failed:", error)
    process.exit(1)
  }
}

migrate()
