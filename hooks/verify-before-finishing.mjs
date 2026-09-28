#!/usr/bin/env node
// Stop hook: when the answer the agent is about to finish with cites legal authority and no
// OpenCase verification tool ran during this turn, ask it once to verify before finishing.
//
// Reads only the local conversation transcript whose path the host passes on stdin. Sends
// nothing anywhere. Any input it does not recognise ends the hook without blocking.
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

// Tools whose results carry OpenCase's own verification of the authorities they return.
const VERIFYING_TOOLS = [
  'verify_citations_in_text',
  'resolve_legal_citations',
  'get_legal_authority',
  'check_quote',
  'research_legal_question',
  'review_document_against_law',
]

// Each pattern alone is enough to call an answer one that cites legal authority.
const CITATION_PATTERNS = [
  // Reporter citation: volume, reporter, first page. "410 U.S. 113", "123 Cal. App. 4th 456".
  // Every word of the reporter ends in a period, which keeps the match linear. A page followed by
  // a lowercase word is a sentence ("3 PRs. 12 tests pass"), not a citation.
  /\b\d{1,4} [A-Z][A-Za-z]*\.(?: ?(?:[A-Z][A-Za-z]*\.|\d(?:d|th|st|nd|rd)\.?))* \d{1,5}\b(?! [a-z])/,
  // Code section: "42 U.S.C. § 1983", "Cal. Civ. Code § 1542"
  /§ ?\d/,
  // Federal code or regulation without a section sign: "29 C.F.R. 1910.1200"
  /\b\d{1,3} (?:U\.S\.C\.|C\.F\.R\.) ?\d/,
  // Case name: "Roe v. Wade"
  /\b[A-Z][\w.'&-]* v\. [A-Z]/,
  // Neutral or database citation: "[2019] UKSC 12", "2020 ONCA 45", "2020 WL 123456"
  /(?:\[\d{4}\]|\b\d{4}) [A-Z]{2,}[A-Za-z]* \d{1,7}\b/,
  // Commonwealth case name, with no period after v: "Donoghue v Stevenson", "R v Jordan"
  /\b[A-Z][\w.'’&-]* v (?:The |the )?[A-Z][\w'’&-]*[a-z]/,
  // Act pinpoint: "Equality Act 2010, s 109(2)", "Family Law Act 1975 (Cth) ss 68B"
  /\b(?:Act|Code|Rules|Regulations|Constitution)(?:,? \d{4})?(?: \([A-Za-z. ]{2,12}\))?\]?\*?,? (?:ss?|rr?|regs?|arts?|sch|pt|para)\.? ?\d/,
  // "section 89 of the Family Law Act", "Article 26 of the Civil Code"
  /\b(?:[Ss]ections?|ss?\.|[Aa]rticles?|[Rr]ules?|[Rr]egulations?|r\.) ?\d+[A-Za-z]?(?:\.\d+)*(?:\([0-9a-zA-Z]+\))*(?:,? (?:and|or|to) \d+[A-Za-z]?(?:\.\d+)*)? of the \*?(?:[A-Z][\w'’()-]* ){0,8}(?:Act|Code|Rules|Regulations|Constitution|Convention)\b/,
  // Court rule: "Fed. R. Civ. P. 56(d)", "Tex. R. Evid. 401", "Ill. Sup. Ct. R. 191(a)", "CPR 31.8"
  /\bR\. (?:Civ|Crim|App|Evid|Bankr|Gen|Juv|Prof)\.(?: [A-Z][a-z]*\.)* ?\d|\bSup(?:er)?\. Ct\. R\. \d|\b(?:FRE|FRCP|FRAP|FRBP|CPR|FPR|MCR|CPLR) \d|\bRules of Court,? (?:rule|r\.?) \d/,
  // State code: "750 ILCS 5/602.7", "RCW 7.105.150", "N.J.S.A. 2C:20-4", "La. Code Civ. Proc. art. 1426"
  /\b\d+ ILCS \d|\b(?:RCW|ORS|MCL|N\.J\.S\.A\.|K\.S\.A\.|O\.C\.G\.A\.|R\.S\.A\.|C\.R\.S\.|A\.R\.S\.) ?§? ?\d|\bStat\.(?: Ann\.)? (?:§ )?\d|\bCode(?: [A-Z][a-z]*\.)+ art\. \d/,
  // Year-first report: "[1995] 4 SCR 411", "[2001] EWCA Civ 414", "(1997) 188 CLR 652"
  /(?:\[\d{4}\]|\(\d{4}\)) (?:\d{1,4} )?[A-Z][A-Za-z.]*(?: [A-Z][a-z]{1,4}\.?)? \d{1,6}\b(?! [a-z])/,
  // Numbered provision with a subsection: "Rule 26(f)", "Section 6108(e)(1)(i)"
  /\b(?:Rule|Section|Article|Regulation) \d+[A-Za-z]?(?:[.-]\d+)*\([0-9a-zA-Z]{1,4}\)/,
  // Other rules and instruments: "Cal. R. Ct. 3.1345", "C.R.C.P. 59", "SI 1998/3132", "SOR/2019-1"
  /\bR\. ?Ct\. \d|\b(?:Civ|Crim|Evid|App)\. R\. \d|\b(?:[A-Z]\.){3,5}P\. \d|\bSupreme Court Rules? \d|\bRules of Professional Conduct,? (?:[Rr]ule )?\d|\bSI \d{4}\/\d|\bSOR\/\d/,
  // Canadian statute: "RSC 1985, c C-46", "S.O. 2019, c. 7"
  /\b(?:R\.?S\.?[A-Z]{0,2}\.?|S\.?[A-Z]{1,2}\.?) \d{4}, c\.? [A-Z]?[-.\d]/,
]

export function citesLegalAuthority(text) {
  return CITATION_PATTERNS.some(pattern => pattern.test(text))
}

function readEntries(transcriptPath) {
  return readFileSync(transcriptPath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(line => {
      try {
        return JSON.parse(line)
      } catch {
        return undefined
      }
    })
    .filter(entry => entry && !entry.isSidechain)
}

function blocks(entry) {
  const content = entry.message?.content
  if (typeof content === 'string') return [{ type: 'text', text: content }]
  return Array.isArray(content) ? content : []
}

// A prompt the person typed, as opposed to a tool result the host files under the user role.
function isPrompt(entry) {
  return entry.type === 'user' && !entry.isMeta && !blocks(entry).some(block => block.type === 'tool_result')
}

/** Whether to ask the agent to verify, given the hook input and the transcript entries. */
export function needsVerification(input, entries) {
  if (input.stop_hook_active) return false
  const turnStart = entries.findLastIndex(isPrompt)
  if (turnStart < 0) return false
  const turn = entries.slice(turnStart + 1)
  const verified = turn.some(entry =>
    entry.type === 'assistant' && blocks(entry).some(block =>
      block.type === 'tool_use' && VERIFYING_TOOLS.some(tool => String(block.name).endsWith(tool))))
  if (verified) return false
  const lastAnswer = typeof input.last_assistant_message === 'string'
    ? input.last_assistant_message
    : blocks(turn.findLast(entry => entry.type === 'assistant') ?? {})
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n')
  return citesLegalAuthority(lastAnswer)
}

const REASON = 'This answer cites legal authority that OpenCase has not checked during this turn. '
  + 'Before finishing, verify the citations with OpenCase (verify_citations_in_text or resolve_legal_citations) '
  + 'and any quotations with check_quote, then correct or flag anything that did not verify. '
  + 'If these citations were already verified earlier in the conversation, finish as you were. '
  + 'If the OpenCase tools are unavailable, tell the person the citations are unverified.'

function main() {
  try {
    const input = JSON.parse(readFileSync(0, 'utf8'))
    if (typeof input.transcript_path !== 'string' || input.stop_hook_active) return
    // Most answers cite nothing, so skip reading the transcript when the host supplies the answer.
    if (typeof input.last_assistant_message === 'string' && !citesLegalAuthority(input.last_assistant_message)) return
    if (needsVerification(input, readEntries(input.transcript_path))) {
      process.stdout.write(JSON.stringify({ decision: 'block', reason: REASON }))
    }
  } catch {
    // A hook that cannot read its input must never stop the agent from finishing.
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main()
