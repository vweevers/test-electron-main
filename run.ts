import { tap } from 'node:test/reporters'
import { run as run_ } from 'node:test'

export type Result = {
  success: boolean,
  total: number,
  passed: number,
  failed: number
}

export async function run (modules: string[]): Promise<Result> {
  // Don't use the `files` or `globPatterns` options of Node.js because those imports would go
  // through Node.js's internal loader without a statically analyzable import() that Vite would be
  // able to rewrite. Instead pass 0 files, then do our own import below. This works because Node.js
  // allows additional tests to register themselves after run() returns.
  const tests = run_({
    files: [],
    isolation: 'none'
  })

  let total = 0
  let passed = 0
  let failed = 0
  let pending = 1

  // TODO: suppress repeated TAP header in watch mode, or use in-process reporters
  tests.compose(tap).pipe(process.stdout)

  // Track pending tests to detect the end. Normally, Node.js relies on a natural end of the
  // process, hooking into process.on('beforeExit') to print a summary. We can't do the same.
  const deferred = Promise.withResolvers<Result>()
  const next = () => {
    if (--pending === 0) {
      deferred.resolve({
        // No tests could be legitimate but more likely points to a bad setup
        success: total > 0 && passed === total,
        total,
        passed,
        failed
      })
    }
  }

  // Emitted when a new test is registered
  tests.on('test:enqueue', () => {
    pending++
    total++
  })

  // Emitted when a test has passed or failed
  tests.on('test:complete', (data) => {
    if (data.details.passed) {
      passed++
    } else {
      failed++
    }

    setImmediate(next)
  })

  for (const moduleName of modules) {
    await import(/* @vite-ignore */ moduleName)
  }

  // Represents that imports have finished
  next()

  return deferred.promise
}
