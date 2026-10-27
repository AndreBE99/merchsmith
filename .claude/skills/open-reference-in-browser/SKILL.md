---
name: open-reference-in-browser
description: Opens an HTML file from "Merchsmith Platform Design/" in the browser via a local static server on localhost:8642, so linked CSS/JS load correctly (file:// strips them). Trigger: /open-reference-in-browser <file>, e.g. "/open-reference-in-browser @Merchsmith Platform Design/Merchsmith Project - Autumn Giveaways.html".
---

1. Take the argument as the target file path. Strip a leading "@" if present.
2. Strip any prefix up through "Merchsmith Platform Design/" so you're left with the path relative to that folder (e.g. "Merchsmith Project - Autumn Giveaways.html").
3. First run `scripts/update-reference.sh` with Bash (from the repo root). If the user's message also names a folder with a newer version of the reference (e.g. "actualiza con ~/Downloads/Design"), pass it as the argument so it is synced in place. This stops any stale server on :8642 (one started before the folder was replaced serves a deleted directory and 404s). Then start a fresh server: call mcp__Claude_Browser__preview_start with {"name": "design-docs"}. That config lives in this project's .claude/launch.json. If it's missing (e.g. running in a fresh checkout), add it first:
   {
     "name": "design-docs",
     "runtimeExecutable": "python3",
     "runtimeArgs": ["-m", "http.server", "8642", "--directory", "Merchsmith Platform Design"],
     "port": 8642,
     "autoPort": false
   }
4. URL-encode the relative path from step 2 (spaces -> %20, etc.) and call mcp__Claude_Browser__navigate with the tabId from step 3's result, to url `http://localhost:8642/<encoded-relative-path>`.
5. No other tool calls beyond what's needed above (including the script in step 3) (no screenshot unless the user asks). Reply with only: "Abierto en http://localhost:8642/<relative-path>." Continue the rest of the conversation in Spanish.
