import test from 'node:test'
import assert from 'node:assert'
import { clipboard } from 'electron'

test('read and write clipboard', function () {
  clipboard.writeText('hello world')
  assert.equal(clipboard.readText(), 'hello world')
})
