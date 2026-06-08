import { app } from 'electron'
import { createServer } from 'vite'
import MagicString from 'magic-string'
import { glob } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { builtinModules } from 'node:module'

async function main () {
  await app.whenReady()

  const cwd = process.cwd()
  const payload = process.argv.pop()
  const { options, patterns } = JSON.parse(payload)
  const debugging = options['inspect'] || options['inspect-brk']
  const ids = new Set()

  // Create a runnable environment that resolves and transforms modules in-process
  const server = await createServer({
    root: cwd,
    configFile: false,
    appType: 'custom',
    mode: 'development',
    plugins: debugging ? [breakOnTest(ids)] : [],
    server: {
      watch: options.watch ? {} : null
    },
    environments: {
      electron: {
        resolve: {
          builtins: builtins()
        }
      }
    }
  })

  const environment = server.environments['electron']
  const runPath = fileURLToPath(new URL('./run.ts', import.meta.url))
  const { run } = await environment.runner.import(runPath)

  // Repeat the glob search every run, to find new files
  const runWithFiles = async () => {
    const files = await resolveFiles(cwd, patterns, ids)
    const modules = files.map(viteModule)

    return run(modules)
  }

  if (options.watch) {
    let runs = 0

    const runSummarized = async () => {
      const { success, passed, failed, total } = await runWithFiles()

      // Empty runs can happen if modified file was not a test
      if (total > 0) {
        console.log(`# Summary (#${++runs})`)

        if (success) {
          console.log(`ok ${total + 1} - ${passed} passed\n`)
        } else {
          console.log(`not ok ${total + 1} - ${passed} passed, ${failed} failed\n`)
        }
      }
    }

    await runSummarized()

    let queue = Promise.resolve()
    let timer

    const rerun = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        queue = queue.then(runSummarized)
      }, 200)
    }

    server.watcher.on('change', rerun)
    server.watcher.on('add', rerun)
    server.watcher.on('unlink', rerun)
  } else {
    const { success } = await runWithFiles()

    app.exit(success ? 0 : 1)
  }
}

/**
 * Convert a file path, which would be relative to the file doing the import(), to an absolute Vite
 * server path, which is relative to the project root regardless of where the import() is done.
 *
 * @param {string} file Relative file path.
 */
function viteModule (file) {
  return '/' + file.replaceAll('\\', '/')
}

/**
 * Override default builtins to add `electron` so that Vite leaves it as a native import (of the
 * electron runtime) instead of loading the npm package.
 */
function builtins () {
  return [...new Set([
    ...builtinModules,
    ...builtinModules.map((name) => `node:${name}`),
    'electron'
  ])]
}

async function resolveFiles (cwd, patterns, ids) {
  const iterator = glob(patterns, { cwd })
  const files = await Array.fromAsync(iterator)

  ids.clear()

  // Track which files should trigger a debugger break
  for (const file of files) {
    ids.add(normalizeId(join(cwd, file)))
  }

  return files.sort()
}

function normalizeId (id) {
  return id.split('?')[0].replaceAll('\\', '/').toLowerCase()
}

function breakOnTest (ids) {
  return {
    name: 'break-on-test',
    transform (code, id) {
      if (ids.has(normalizeId(id))) {
        // Insert debugger statement and hide it with a source map
        const transformer = new MagicString(code)
        transformer.prepend('debugger;\n')

        return {
          code: transformer.toString(),
          map: transformer.generateMap({
            hires: 'boundary',
            source: id,
            includeContent: true
          })
        }
      }
    }
  }
}

main().catch((err) => {
  // Tell TAP consumer, so that they exit non-zero without needing a TAP plan (per se) or pipefail
  console.log('Bail out! Fatal error. Please inspect stderr.\n')
  console.error(err)
  app.exit(1)
})
