# Run the Foundations of AI quiz locally

The quiz uses plain HTML, CSS and JavaScript. It has no dependencies, accounts, API keys, build step or network requirement.

From the repository root:

```powershell
node 01-foundations-of-ai/serve.js 8000
```

Then open <http://localhost:8000> to see the Course 01 test catalogue. The current test is available directly at <http://localhost:8000/tests/chapter-03-search.html>.

You can also use Python's built-in static server:

```powershell
cd 01-foundations-of-ai
py -m http.server 8000
```

If `py` is unavailable, use:

```powershell
python -m http.server 8000
```

On macOS or Linux, use:

```sh
cd 01-foundations-of-ai
python3 -m http.server 8000
```

Opening `01-foundations-of-ai/index.html` directly is also a useful fallback, but localhost is recommended for consistent saved progress.

## Saved progress

Each test defines its own versioned `localStorage` key. Its active session, question order, responses, flags, revealed answers, assessments and results remain separate from every other test. Use **Reset progress** inside a test to remove that test's saved state.

## Verify the question bank and grading rules

```powershell
node 01-foundations-of-ai/checks.js
```
