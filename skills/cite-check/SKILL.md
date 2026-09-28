---
name: cite-check
description: Cite-check a brief, motion, memo, opinion, or contract with OpenCase. Use when someone asks to check, verify, or audit the citations or quotations in a document, build a table of authorities, or confirm a draft is ready to file.
---

# Cite-check a legal document

A cite-check answers three questions about every authority in a document: does it exist as cited, does the quoted language actually appear in it, and is it still good law. The lawyer signs the filing, so the report has to show exactly what was confirmed and what was not. Never soften a result or fill a gap with your own knowledge of the case.

## Steps

1. **Verify every citation.** Send the whole document to `verify_citations_in_text`, as text or as a public HTTPS link to the file. If the result says `truncated`, split the rest of the document and verify it too, so nothing is skipped silently.
2. **Check every quotation.** For each passage the document puts in quotation marks and attributes to an authority, call `check_quote` with the exact quoted words and that authority's citation (or its `legalContentId` from step 1). Pass the quote as written, including ellipses and brackets.
3. **Check that cases are still good law.** For each verified case, call `check_case_validity`. When it reports negative treatment, `get_case_treatments` shows which decisions treated it and how.
4. **Report**, in the format below. Do not edit the document unless asked.

## Report

Start with one line: how many authorities were cited, and how many need the lawyer's attention.

Then a table of authorities, one row per citation, in the order they appear:

| Citation | Status | Quotation | Good law | Note |
|---|---|---|---|---|

Use these status labels, which map OpenCase's results:

- **Verified**: OpenCase matched the citation to the authority (`verified`).
- **Not confirmed**: OpenCase found a record but could not confirm it matches (`unverified`). Check it by hand.
- **Not found**: OpenCase found no authority for this citation (`unavailable`). This is the result a fabricated citation produces, but OpenCase's coverage has gaps, so say "not found", never "fake".
- **Not checked**: a tool failed or the text was cut off, so this citation was never looked up.

For quotations, report **Matches**, **Does not match** (quote the source passage `check_quote` returned, if any, so the lawyer can see the difference), or **Not checked** when the authority's text was unavailable. For good law, report OpenCase's flag and review status in plain words. A pending, provisional, or stale result is not a clearance; say so.

Put every row that needs attention first in a short list below the table, with what the lawyer should do about each one.

End with a diligence receipt: the date, the tools used, the number of citations and quotations checked, and anything that was not checked and why. This is the record the lawyer keeps with the file.
