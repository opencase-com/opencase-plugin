// Run with: node --test plugins/opencase/manifests.test.mjs
// Claude reads .claude-plugin/plugin.json and .mcp.json; ChatGPT and Codex read plugin.json and
// mcp.json. The shared fields must stay identical so both hosts ship the same plugin.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))

test('both plugin manifests describe the same plugin', () => {
  const claude = read('./.claude-plugin/plugin.json')
  const openai = read('./plugin.json')
  for (const field of ['name', 'version', 'description', 'author', 'homepage', 'license', 'keywords']) {
    assert.deepEqual(openai[field], claude[field], field)
  }
})

test('both MCP configs point at the same server', () => {
  assert.equal(read('./mcp.json').mcpServers.opencase.url, read('./.mcp.json').mcpServers.opencase.url)
})
