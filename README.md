# test-electron-main

**CLI to run [`node:test`](https://nodejs.org/api/test.html) tests in an Electron main process, with watch mode and TypeScript support.** Not intended for UI tests (I'd recommend Playwright) but for unit tests that need to import things from `electron`.

[![npm status](http://img.shields.io/npm/v/test-electron-main.svg)](https://www.npmjs.org/package/test-electron-main)
[![node](https://img.shields.io/node/v/test-electron-main.svg)](https://www.npmjs.org/package/test-electron-main)
[![Test](https://img.shields.io/github/actions/workflow/status/vweevers/test-electron-main/test.yml?branch=main\&label=test)](https://github.com/vweevers/test-electron-main/actions/workflows/test.yml)
[![Standard](https://img.shields.io/badge/standard-informational?logo=javascript\&logoColor=fff)](https://standardjs.com)
[![Common Changelog](https://common-changelog.org/badge.svg)](https://common-changelog.org)

## Usage

Create a `test/clipboard.js` file:

```js
import test from 'node:test'
import assert from 'node:assert'
import { clipboard } from 'electron'

test('read and write clipboard', function () {
  clipboard.writeText('hello world')
  assert.equal(clipboard.readText(), 'hello world')
})
```

Run it:

```
$ test-electron-main test/* | tap-arc

Subtest: read and write clipboard
    ✓ read and write clipboard

total:     1
passing:   1
```

The runner produces TAP output, which can be piped to a reporter of choice. In this example we're using the excellent [`tap-arc`](https://github.com/architect/tap-arc) reporter.

Test files can be authored in JavaScript, TypeScript or both. They are imported through Vite 8 for full TypeScript support at near-native speed. Alternatively you could run your test files with `electron` itself, if they only use erasable TypeScript syntax (that Node.js and Electron can strip).

## Install

With [npm](https://npmjs.org) do:

```
npm install test-electron-main --save-dev
```

Electron is included in dependencies. Ideally you'd bring your own version but atm I need a different version for my own use - which happens to be the latest version (v42 at the time of writing). If that doesn't work for you, I can be persuaded, with chocolates or world peace.

## CLI

### `test-electron-main [options] <glob pattern...>`

One or more glob patterns are required; `test-electron-main` exits with a non-zero code if no tests are found. Negation patterns (e.g. `!foo.js`) are not supported.

Options:

- `--watch` or `-w`: Rerun tests on changes and new files.
- `--inspect=<port>`: Let [debuggers](https://www.electronjs.org/docs/latest/tutorial/debugging-main-process) connect to the specified port. When set, `test-electron-main` automatically breaks on test files.
- `--inspect-brk=<port>`: Like inspect but pauses execution on startup. Once you've attached a debugger, hit Continue once to jump to your tests.
- `--help` or `-h`: Show help message and exit.

## License

[MIT](LICENSE)
