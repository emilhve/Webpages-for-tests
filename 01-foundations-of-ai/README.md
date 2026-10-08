# Course 01 — Foundations of AI

## Structure

```text
01-foundations-of-ai/
├── index.html                 # Course test catalogue
├── shared/
│   ├── quiz-engine.js         # Navigation, grading, persistence and results
│   └── quiz.css               # Shared test and catalogue styling
└── tests/
    ├── chapter-03-search.html
    └── chapter-03-search-data.js
```

Every test has its own HTML page and data file. All tests reuse the shared engine and stylesheet.

## Add another test

1. Copy an existing HTML page in `tests/` and give it a descriptive filename.
2. Create its matching data script with a unique `QUIZ_CONFIG.id`, versioned `storageKey`, expected question count, topic definitions and question bank.
3. Point the new HTML page at that data script while keeping the shared engine and stylesheet references.
4. Add the new test to the catalogue in `index.html`.

A unique storage key keeps each test's progress independent. The shared engine supports single-choice and numeric automatic grading plus rubric-based self-assessment for written, trace and calculation questions.
