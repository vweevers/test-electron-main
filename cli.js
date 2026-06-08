#!/usr/bin/env node

import electron from 'electron'
import { parseArgs } from 'node:util'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const { values: options, positionals: patterns } = parseArgs({
  args: process.argv.slice(2),
  allowPositionals: true,
  allowNegative: true,
  options: {
    help: { type: 'boolean', short: 'h' },
    watch: { type: 'boolean', short: 'w' },
    inspect: { type: 'string' },
    'inspect-brk': { type: 'string' }
  }
})

if (options.help || patterns.length === 0) {
  console.log(`Usage: test-electron-main [options] <glob pattern...>

Options:
  --watch, -w           Rerun tests on changes and new files
  --inspect=<port>      Let debuggers connect to the specified port
  --inspect-brk=<port>  Like inspect but pauses execution on startup
  --help, -h            Show help message and exit.
`)
  process.exit(options.help ? 0 : 1)
}

const electronFlags = []

if (options['inspect-brk']) {
  electronFlags.push('--inspect-brk=' + options['inspect-brk'])
} else if (options.inspect) {
  electronFlags.push('--inspect=' + options.inspect)
}

// Avoid parsing command-line arguments a second time
const payload = JSON.stringify({ options, patterns })
const entryPoint = fileURLToPath(new URL('./index.js', import.meta.url))
const args = [...electronFlags, entryPoint, payload]

// The rest of the code is the same as electron's bin
const child = spawn(electron, args, {
  stdio: 'inherit',
  windowsHide: false
})

let childClosed = false

child.on('close', function (code, signal) {
  childClosed = true
  process.exit(code === null ? 1 : code)
})

const handleSignal = function (signal) {
  process.on(signal, function () {
    if (!childClosed) {
      child.kill(signal)
    }
  })
}

handleSignal('SIGINT')
handleSignal('SIGTERM')
handleSignal('SIGUSR2')
