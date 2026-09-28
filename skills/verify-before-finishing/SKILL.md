---
name: verify-before-finishing
description: Verify legal citations with OpenCase before giving an answer that relies on them. Use whenever a response you are about to give cites cases, statutes, regulations, or rules, or quotes from them, including answers to legal questions and drafts of legal documents.
---

# Verify legal authority before you answer

Lawyers have been sanctioned for filing citations an AI invented. Any citation in your answer, whether you recalled it, found it on the web, or took it from a document, may be wrong until OpenCase has checked it.

For a legal question, `research_legal_question` returns an answer built on authority OpenCase has retrieved. Prefer it to answering from memory.

Before you finish any answer that cites legal authority:

1. Run the citations you are about to give through `verify_citations_in_text` (for prose) or `resolve_legal_citations` (for a list).
2. If you quote an authority, confirm the words with `check_quote`.
3. Keep only what OpenCase verified. Remove any citation OpenCase did not find, or mark it clearly as unverified, and say which. Correct a quotation that does not match, using the source passage `check_quote` returned.
4. If a case is central to the answer, run `check_case_validity` and tell the user about any negative treatment.

Tell the user briefly what you checked, for example: "OpenCase verified 4 of 5 citations; *Smith v. Jones* was not found, so I removed it."
