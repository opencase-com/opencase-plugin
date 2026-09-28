// Run with: node --test plugins/opencase/hooks/verify-before-finishing.test.mjs
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { citesLegalAuthority, needsVerification } from './verify-before-finishing.mjs'

const prompt = { type: 'user', message: { role: 'user', content: 'Is a non-compete enforceable in California?' } }
const answer = text => ({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text }] } })
const toolUse = name => ({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'tool_use', id: 't1', name, input: {} }] } })
const toolResult = { type: 'user', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: '{}' }] } }
const cited = 'Generally no. See Edwards v. Arthur Andersen LLP, 44 Cal. 4th 937 (2008); Cal. Bus. & Prof. Code § 16600.'

test('recognises common citation forms', () => {
  for (const text of [
    'Roe v. Wade, 410 U.S. 113 (1973)',
    'See 550 F.3d 1023.',
    'the court in 123 Cal. App. 4th 456, 460 (2004) held',
    'under 42 U.S.C. § 1983',
    '29 C.F.R. 1910.1200 requires',
    'Donoghue v Stevenson [1932] UKSC 100',
    '2020 WL 123456',
    'F. Supp. 2d: 300 F. Supp. 2d 45',
    'Crabb v Arun District Council',
    'Companies Act 2006, s 167M',
    'section 89 of the Family Law Act',
    'Fed. R. Civ. P. 56(d)',
    'CPR 31.8',
    '750 ILCS 5/602.7',
    'N.J.S.A. 2C:20-4',
    '(1997) 188 CLR 652',
    'Rule 26(f)',
    'SI 2007/783',
    'Criminal Code, RSC 1985, c C-46, s 742.6',
  ]) assert.equal(citesLegalAuthority(text), true, text)
  for (const text of [
    'Run pnpm install, then restart the server on port 3000.',
    'Version 2 of the API returns 404 for missing rows.',
    'We shipped 3 PRs. 12 tests pass.',
    'The contract renews on March 1, 2027 unless terminated.',
  ]) assert.equal(citesLegalAuthority(text), false, text)
})

test('stays linear on a long run of capitals', () => {
  const started = performance.now()
  citesLegalAuthority(`10 A.${'B'.repeat(50_000)}`)
  assert.ok(performance.now() - started < 1_000)
})

test('asks once when a cited answer was not verified this turn', () => {
  assert.equal(needsVerification({}, [prompt, answer(cited)]), true)
  assert.equal(needsVerification({ stop_hook_active: true }, [prompt, answer(cited)]), false)
  assert.equal(needsVerification({}, [prompt, answer('Generally no, with narrow exceptions.')]), false)
})

test('accepts verification from any OpenCase tool this turn, under any server prefix', () => {
  const entries = [prompt, toolUse('mcp__plugin_opencase_opencase__verify_citations_in_text'), toolResult, answer(cited)]
  assert.equal(needsVerification({}, entries), false)
})

test('does not count verification from an earlier turn, and prefers the host-supplied answer', () => {
  const earlier = [prompt, toolUse('mcp__opencase__check_quote'), toolResult, answer('Done.')]
  assert.equal(needsVerification({}, [...earlier, prompt, answer(cited)]), true)
  assert.equal(needsVerification({ last_assistant_message: 'All set.' }, [prompt, answer(cited)]), false)
})
