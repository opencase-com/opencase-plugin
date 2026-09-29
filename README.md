# OpenCase

OpenCase checks legal writing against the law itself. It confirms that every case, statute, and regulation a brief, memo, or contract cites exists as cited, that quoted language appears word for word in the source, and whether a case is still good law. It also answers legal questions with authority it has verified.

The same plugin runs in Claude (Claude Code and Cowork) and in ChatGPT and Codex.

## What you get

- **Cite-check skill.** Ask for a cite-check of a document and get a table of authorities: each citation's status, whether its quotation matches, its good-law flag, and a diligence receipt to keep with the file.
- **Verify-before-finishing skill.** Whenever an answer is about to cite legal authority, the citations are verified with OpenCase first, and anything that fails is removed or flagged.
- **A stop check** (Claude Code and Cowork). If an answer cites legal authority and no OpenCase verification ran during that turn, the agent is asked once to verify before it finishes.
- **The OpenCase tools:** legal research, document review, citation detection and verification, authority retrieval, quotation checking, case validity and treatment, and federal docket search.

## Setup

Install the plugin, then connect your OpenCase account when prompted. You can log in or create an account from the connection screen. A free account includes 10 tool calls a day; a paid plan removes the limit. See [opencase.com](https://www.opencase.com) for plans.

## Data and privacy

- **The OpenCase server.** Every tool call goes to `https://www.opencase.com/mcp` over HTTPS, signed in with your OpenCase account through OAuth. What a tool call sends is what you ask it to check: the text or the public link to the document, a citation, a quotation, or a question. OpenCase uses it to answer the call, records the call against your account for billing, keeps a log of research questions and answers to diagnose and improve the service, and may store the legal sources it looks up. The [privacy policy](https://www.opencase.com/privacy) covers how that data is kept.
- **Public legal sources.** To find an authority, OpenCase may search public legal databases and the web on its own servers. Your client does not contact them.
- **The stop check.** `hooks/verify-before-finishing.mjs` runs on your machine with Node.js. It reads the local conversation transcript that the host passes to it, to see whether the latest answer cites legal authority and whether an OpenCase tool ran. It sends nothing over the network and writes nothing to disk.

OpenCase is a research tool, not a lawyer. A citation it cannot find may still exist, and a verified citation still needs a lawyer's judgment about whether it supports the point.

## Support

Email [support@opencase.com](mailto:support@opencase.com).
