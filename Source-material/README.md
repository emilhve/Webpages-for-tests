# README — Chapter 3 Search Quiz

## Purpose and source

Build a local study quiz in English. This README is the complete content and implementation specification: the builder does not need the textbook, slides, web research, an AI API, or additional academic material.

Academic source: Stuart Russell and Peter Norvig, *Artificial Intelligence: A Modern Approach*, the user-provided edition of Chapter 3, “Solving Problems by Searching,” printed pp. 81–122. Questions and miniature examples below are original practice tasks based on that chapter, not copied textbook exercises. Section references identify the concepts being tested. No external sources were used.

## Exact scope

- Include §§3.1–3.3 in full.
- Include §3.4 in full, including uninformed bidirectional search (§3.4.5).
- Include §§3.5.1–3.5.4 and the §3.5 introduction.
- Include the §3.6 introduction, §§3.6.1–3.6.2, and §3.6.6 “Learning heuristics from experience.”
- Exclude §§3.5.5–3.5.6, the effective-depth discussion on printed p. 116, and §§3.6.3–3.6.5.
- Effective branching factor b* IS included; effective depth is not.
- Do not add questions on excluded topics. Do not confuse §3.6.6 with the excluded §3.6.5.

## Prompt to give Codex

> Read this entire README and build the local quiz website it specifies. Implement the frontend, using the complete embedded question bank as the sole source of educational content. Do not research, invent or omit questions or answers. Use plain HTML, CSS and JavaScript with no build step, external dependencies, CDN, backend, accounts or API keys. Extract the embedded JSON into a local JavaScript data module or script; do not fetch or parse this Markdown at runtime. Implement the specified study/quiz modes, topic filters, question navigation, automatic grading for numeric and single-choice items, rubric-based self-assessment for written tasks, local progress persistence, and results/retry flows. Keep all 64 IDs and all prompts, choices, answers, explanations and checklists. Make the interface responsive and keyboard-accessible. Use readable mathematical notation and preserve line breaks. Verify the question count, answer keys, grading, shuffle behavior, persistence and reset. Run the available local checks, fix problems, and provide exact commands to serve the website locally. Keep this source README intact and put run instructions in a separate RUN.md. Complete the implementation rather than only proposing a plan.

## Frontend requirements

### Technology and running locally

Use `index.html`, a stylesheet, JavaScript for UI behavior, and a local question-data script. No frameworks or package installation are needed. Support serving with `python3 -m http.server 8000` (Windows alternative: `py -m http.server 8000`) and opening `http://localhost:8000`. This is a static file server, not an application backend. Directly opening index.html is a useful fallback if possible; localStorage persistence should be validated on localhost. Everything must work without network requests after loading local assets. Do not deploy or publish.

### Start and study flow

- Show title, brief scope, 64-question count and section/topic filters; mixed-section Q64 appears when any of its sections is selected.
- Offer 10, 20 or all matching questions. When fewer match, use all available and state the count. Handle empty filters.
- Offer optional question shuffle (off by default), and a seed/session-stable order. Do not shuffle choices unless their stable choice IDs are preserved.
- Study mode: answer, submit and receive feedback immediately. Written tasks have an explicit “Reveal model answer” action after attempting or skipping.
- Quiz mode: hide answers until the session is submitted. Provide previous/next, answered count, progress, question index and flag-for-review. Preserve answers when navigating.
- Each card displays ID, section, difficulty, type and complete prompt. Repeated graph definitions are intentional so questions are self-contained.
- Numeric questions use a numeric input. Choice questions use a radio group. Written, trace and calculation tasks use a multiline answer area.
- After reveal, show correct answer, explanation and keyPoints when present. Treat model answers as learning material, not strings to match.
- For written/trace/calculation responses, let the learner assess “Correct”, “Partly correct” or “Needs review” using the checklist. Never claim these were automatically graded.
- Show results grouped by topic and item. Offer retry of incorrect/needs-review items and flagged items. Review-only retries should retain the original results separately.
- Persist session IDs/order, responses, flags, review state and progress in versioned localStorage. Resume on refresh. Provide clear progress reset with an in-page confirmation, and recover gracefully from missing/corrupt storage.
- Visually separate machine-graded results from self-assessed results. Show unanswered/unassessed counts; never silently grade unassessed writing as correct.

### Grading contract

- `single-choice`: `answer` is the correct stable option ID. Exact ID equality. Show the correct option text when revealing.
- `numeric`: `answer` is a number and `tolerance` is an absolute tolerance. Reject empty/non-finite input. A response is correct if `abs(value-answer) <= tolerance`; allow a decimal comma for a simple numeric entry as well as a decimal point. Do not accept partial strings such as `2xyz`.
- `written`, `trace`, `calculation`: manual self-assessment using `answer` and `keyPoints`. An entered response is an attempt, not proof of correctness.
- Score machine-gradable questions as correct/total machine-gradable selected; show unanswered separately (zero credit on submission). Show self-assessment category counts independently. Avoid an ambiguous combined score.
- Do not put answer text into visible question titles, input defaults, placeholders or accessible labels before reveal. Client-side source necessarily contains answers; this is a personal study tool, not a secure examination.

### Design and accessibility

Readable restrained layout, comfortable text width, clear hierarchy, high contrast, responsive from phone to desktop. Use actual buttons, labels and fieldsets; visible keyboard focus; feedback that does not rely only on color. Render supplied strings as text, not unsanitized HTML. Use Unicode symbols or safe local formatting for g, h, f, superscripts and arrows; no external equation renderer is required. A simple local SVG graph may supplement a trace, but the full edge-list prompt must remain visible and the diagram must not introduce or omit edges.

### Acceptance checks

1. Exactly 64 unique IDs Q01–Q64 load; every question has an answer and explanation, every non-automatic item has a checklist, and all numeric items specify tolerance.
2. Each single-choice answer matches one supplied option. No choice is selected by default.
3. Correct and incorrect answers are handled for every automatic type, including blank numeric inputs, decimal commas and invalid strings.
4. Changing question order does not change ID-to-answer mappings. Revisiting a question preserves its response.
5. Quiz mode does not reveal answers before submission. Study mode reveals feedback at the intended time.
6. Written responses are explicitly self-assessed; navigation alone does not mark them correct.
7. Filters, short sessions, empty results, flags, retries, resume and reset work.
8. The browser makes no external content/API requests; keyboard navigation and a narrow viewport work.
9. Preserve this README. Provide RUN.md describing the local server command and where progress is stored.

## Conventions and accuracy notes

- Depth counts actions (root depth 0); g counts accumulated action cost; h estimates remaining cost; f orders the frontier.
- Unless specified otherwise, costs are positive, successors are finite, h is nonnegative and h(goal)=0. Infinite-space completeness statements require the stated extra conditions.
- BFS bounds use early goal testing as in Figure 3.9: O(b^d) time and space for b≥2. UCS and A* test goals on removal from the priority queue.
- “Removed/entered” and “expanded” are different: a goal can be removed and returned without generating its children. Trace questions specify which list is requested.
- Improved routes must be handled; consistent A* does not need to reopen expanded states, but may improve the route to a discovered state that is still in the frontier. First discovery is not generally final.
- Admissible but inconsistent h requires reopening when necessary. Admissibility alone does not guarantee nondecreasing f along edges.
- The quoted uninformed bounds concern implicit tree size and constant per-node operations; explicit-graph and queue-operation costs may be analyzed differently.
- For b*, N excludes the initial node and counts generated search nodes. A depth-d returned path requires N≥d, so b*≥1 for d>0 regardless of edge costs. At d=0 the equation is indeterminate.
- All exercise-specific tie rules, goal conventions, graph edges, boards and parameter values are supplied in the question itself. No figure lookup is required.

## Topic index

| Questions | Coverage |
| --- | --- |
| Q01–Q04 | Problem-solving agents and formulation |
| Q05–Q10 | Standardized and real-world problems |
| Q11–Q18 | Search mechanics, repeated states and performance |
| Q19–Q35 | Uninformed search and worked traces |
| Q36–Q49 | Heuristic search, A*, contours and weighted A* |
| Q50–Q60 | Puzzle heuristics, b*, dominance and relaxation |
| Q61–Q63 | Learning heuristics from experience |
| Q64 | Integrated algorithm-design task |

## Human-readable question list

Full answers and grading details follow in the JSON bank.

- **Q01 · §3.1 · written · easy** — Describe the four phases of a problem-solving agent, in order.
- **Q02 · §3.1.1 · written · easy** — Specify the components of a search problem, and distinguish a solution from an optimal solution.
- **Q03 · §3.1 · single-choice · easy** — When can a correct fixed action sequence be executed open-loop with the guarantee described in this chapter?
- **Q04 · §3.1.2 · written · medium** — In route finding, why might the state be just the current city? When would fuel level also need to be included?
- **Q05 · §3.2.1 · numeric · easy** — A vacuum world has 4 cells. The agent occupies exactly one cell; each cell independently is clean or dirty. Orientation is not represented. How many states are there?
- **Q06 · §3.2.1 · written · medium** — Formulate an 8-puzzle search problem. State how many actions are legal when the blank is in a corner, an edge midpoint, or the center.
- **Q07 · §3.2.1 · written · medium** — How can a problem with only three action types have an infinite state space? Use the textbook’s number problem starting at 4.
- **Q08 · §3.2.2 · written · medium** — Why is current airport alone an insufficient state for airline itinerary search?
- **Q09 · §3.2.2 · written · medium** — Compare ordinary route finding with a tour that must visit every required city and return to the start. What additional state information does the tour need?
- **Q10 · §3.2.2 · written · medium** — Give one modeling challenge for each of robot navigation, chip layout and automatic assembly sequencing.
- **Q11 · §3.3 · written · easy** — Distinguish a state-space graph from a search tree. Can two search nodes represent the same state?
- **Q12 · §3.3.2 · written · easy** — What four fields does the textbook store in a search node, and how is a solution reconstructed?
- **Q13 · §3.3 · single-choice · easy** — Which statement correctly describes the frontier and the reached table?
- **Q14 · §3.3.1 · written · medium** — A state X was reached with g=12. A new child reaches X with g=8. What should generic best-first graph search do, and why?
- **Q15 · §3.3.1 · single-choice · easy** — Which value decides whether a new route improves a previously reached state, and which value orders the best-first frontier?
- **Q16 · §3.3.3 · written · medium** — Compare checking only for cycles on the current path with keeping a table of all reached states.
- **Q17 · §3.3.4 · written · easy** — Define completeness, cost optimality, time complexity and space complexity.
- **Q18 · §3.3.4 · written · medium** — Explain |V|, |E|, b, d and m, and when each style of complexity description is useful.
- **Q19 · §3.4 · single-choice · easy** — Match frontier structures to BFS, DFS and uniform-cost search.
- **Q20 · §3.4.1 · trace · medium** — Use this directed tree: S has children A then B; A has children C then D; B has children E then G; C has child F. D, E, F and G have no children. G is the only goal. All edges cost 1. Use the specified left-to-right child order. Run BFS with goal testing when children are generated. List expanded nodes and the returned path.
- **Q21 · §3.4.3 · trace · medium** — Use this directed tree: S has children A then B; A has children C then D; B has children E then G; C has child F. D, E, F and G have no children. G is the only goal. All edges cost 1. Use the specified left-to-right child order. Run recursive-style DFS, exploring the first child completely before the next. Test for a goal on entering a node. List entered nodes and the returned path.
- **Q22 · §3.4.1 · single-choice · easy** — BFS finds a shallowest goal. Under what standard condition does this also guarantee a cheapest solution?
- **Q23 · §3.4.1 · written · medium** — Derive BFS time and space complexity with maximum branching factor b≥2 and a shallowest goal at depth d. Use early goal testing.
- **Q24 · §3.4.1 · numeric · easy** — A full search tree has branching factor 3. How many nodes, including the root, are there through depth 4?
- **Q25 · §3.4.2 · trace · medium** — Use this directed weighted graph, with no other edges: S→A:2, S→B:1, A→G:2, B→G:10. S is the start and G the only goal. Generate successors alphabetically; break equal priorities alphabetically by state. For cost-based searches, accept a goal only when it is removed as the minimum-priority frontier node. Trace uniform-cost search: list removed states with g-values and give the solution.
- **Q26 · §3.4.2 · written · medium** — Use this directed weighted graph, with no other edges: S→A:2, S→B:1, A→G:2, B→G:10. S is the start and G the only goal. Generate successors alphabetically; break equal priorities alphabetically by state. For cost-based searches, accept a goal only when it is removed as the minimum-priority frontier node. Why would stopping at the first generated goal be wrong for uniform-cost search?
- **Q27 · §3.4.2 · written · hard** — Explain why uniform-cost search returns an optimal solution with nonnegative action costs.
- **Q28 · §3.4.2 · written · hard** — Why does the textbook require finite branching and an action-cost lower bound ε>0 for the usual completeness guarantee of UCS? State its implicit-space time/space bound.
- **Q29 · §3.4.3 · written · medium** — Why can tree-like DFS fail to find an existing solution? How does graph-search DFS change the finite-state case?
- **Q30 · §3.4.3 · written · medium** — Explain O(b^m) time and O(bm) space for ordinary tree-like DFS on a finite search tree. Why can backtracking use O(m) space?
- **Q31 · §3.4.4 · written · medium** — Distinguish cutoff from failure in depth-limited search. What if the shallowest goal depth is 5 but the limit is 3?
- **Q32 · §3.4.4 · written · medium** — How does iterative deepening work, and why can it be efficient despite revisiting shallow nodes?
- **Q33 · §3.4.4 · numeric · medium** — A full binary tree is searched to limits 0,1,2,3 by iterative deepening. Assume every iteration visits its entire tree through the limit (no early stop). Count node visits across all iterations, including repeated visits and the root.
- **Q34 · §3.4.5 · written · medium** — Explain bidirectional search, its idealized O(b^(d/2)) advantage, and two practical requirements.
- **Q35 · §3.4.6 · written · medium** — Choose and justify an uninformed search for each: (a) equal costs, unknown shallow goal depth, little memory; (b) differing positive costs and required optimality; (c) equal costs, ample memory, shallow goal.
- **Q36 · §3.5 · single-choice · easy** — Which mapping of evaluation functions is correct?
- **Q37 · §3.5.1 · trace · medium** — Use this directed weighted graph, with no other edges: S→A:2, S→B:1, A→G:2, B→G:10. S is the start and G the only goal. Generate successors alphabetically; break equal priorities alphabetically by state. For cost-based searches, accept a goal only when it is removed as the minimum-priority frontier node. Set h(S)=4, h(A)=2, h(B)=1, h(G)=0. Trace greedy best-first search using f=h.
- **Q38 · §3.5.2 · trace · hard** — Use this directed weighted graph, with no other edges: S→A:2, S→B:1, A→G:2, B→G:10. S is the start and G the only goal. Generate successors alphabetically; break equal priorities alphabetically by state. For cost-based searches, accept a goal only when it is removed as the minimum-priority frontier node. Set h(S)=4, h(A)=2, h(B)=1, h(G)=0. Trace A*, giving (g,h,f) when each node is removed.
- **Q39 · §3.5.2 · single-choice · easy** — What does admissibility mean, using h*(n) for the actual cheapest remaining cost?
- **Q40 · §3.5.2 · written · hard** — Give the consistency inequality for an edge n→n′ of cost c. Explain its relation to admissibility.
- **Q41 · §3.5.2 · written · hard** — Graph: S→A costs 2, A→G costs 2, S→G costs 5. No other edges. Let h(S)=4, h(A)=1, h(G)=0. Is h admissible? Is it consistent?
- **Q42 · §3.5.2 · written · hard** — Prove why A* with an admissible heuristic cannot return a suboptimal goal. State the goal-test and repeated-state assumptions.
- **Q43 · §3.5.2 · trace · hard** — Graph: S→A:3, S→B:1, B→A:1, A→G:3. Heuristic: h(S)=5, h(A)=0, h(B)=4, h(G)=0. No other edges. Compare A* that reopens improved states with a variant that never reopens an expanded state.
- **Q44 · §3.5.3 · written · medium** — What is a search contour? For A* with a consistent heuristic and optimal cost C*, describe nodes with f<C*, f=C* and f>C*.
- **Q45 · §3.5.3 · written · hard** — Derive why consistency implies f does not decrease from n to its child n′.
- **Q46 · §3.5.2 · single-choice · easy** — What does A* become when h(n)=0 for every node?
- **Q47 · §3.5.4 · numeric · easy** — Weighted A* uses f(n)=g(n)+W h(n). For g=8, h=5 and W=2, calculate f.
- **Q48 · §3.5.4 · written · medium** — Explain the speed/quality tradeoff in weighted A*. If W=1.5 and C*=40, what upper bound applies under the usual weighted-A* assumptions?
- **Q49 · §3.5.4 · written · medium** — Distinguish bounded-suboptimal, bounded-cost and unbounded-cost search. Which category includes speedy search?
- **Q50 · §3.6 · written · medium** — Define the misplaced-tile and Manhattan-distance heuristics for a unit-cost sliding-tile puzzle. Why is the blank excluded?
- **Q51 · §3.6 · calculation · medium** — Use rows as follows. Goal: [1,2,3] / [4,5,6] / [7,8,0]. Start: [1,2,3] / [5,0,6] / [4,7,8]. Here 0 is the blank. Compute misplaced tiles h1 and Manhattan distance h2, excluding 0.
- **Q52 · §3.6.1 · single-choice · easy** — If admissible h2 dominates admissible h1, which inequality holds at every state?
- **Q53 · §3.6.1 · written · medium** — Does a dominating heuristic always make A* faster in wall-clock time? Explain.
- **Q54 · §3.6.1 · numeric · medium** — A search generates N=14 nodes excluding the root and returns a solution at depth d=3. Find b* from N+1=1+b*+(b*)^2+(b*)^3.
- **Q55 · §3.6.1 · written · medium** — Under the generated-search-node convention N+1=Σ(i=0..d)(b*)^i, why is b*≥1 when d>0? When is equality attained?
- **Q56 · §3.6.1 · calculation · medium** — Two heuristics solve the same unit-cost instance at depth 3. One generates 14 nodes excluding the root, the other 39. Compare their effective branching factors.
- **Q57 · §3.6.2 · written · medium** — What is a relaxed problem, and why does its exact optimal cost give an admissible heuristic for the original problem?
- **Q58 · §3.6.2 · written · medium** — For sliding tiles, which relaxations lead to (a) Manhattan distance and (b) misplaced tiles?
- **Q59 · §3.6.2 · single-choice · easy** — Two admissible heuristics give h1(n)=6 and h2(n)=9. Which combination is guaranteed admissible for all states?
- **Q60 · §3.6.2 · written · hard** — Show that the maximum of consistent heuristics is consistent.
- **Q61 · §3.6.6 · written · medium** — How can solved search problems supply training data for a heuristic, and what guarantee can be lost?
- **Q62 · §3.6.6 · numeric · easy** — A learned heuristic is h(n)=2x1(n)+3x2(n). If x1=4 and x2=2, what is h(n)?
- **Q63 · §3.6.6 · single-choice · easy** — A learned heuristic is zero at every goal. Does this alone prove admissibility?
- **Q64 · §3.4–3.6 · written · hard** — You need cheapest paths in a finite graph with positive costs. An inexpensive admissible heuristic is available but may be inconsistent. Choose an algorithm and specify the repeated-state and stopping rules.

## Complete question bank (authoritative content)

The JSON below is valid and self-contained. Extract it once during implementation into a local data file. Each item includes its full answer and feedback.

```json
{
  "version": 1,
  "title": "Chapter 3 — Solving Problems by Searching",
  "questions": [
    {
      "id": "Q01",
      "section": "3.1",
      "type": "written",
      "difficulty": "easy",
      "prompt": "Describe the four phases of a problem-solving agent, in order.",
      "answer": "Goal formulation: decide the desired outcome. Problem formulation: define relevant states, actions, transitions and costs. Search: find an action sequence using the model. Execution: carry out the chosen actions.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "Correct order",
        "Distinguishes simulated search from real execution"
      ]
    },
    {
      "id": "Q02",
      "section": "3.1.1",
      "type": "written",
      "difficulty": "easy",
      "prompt": "Specify the components of a search problem, and distinguish a solution from an optimal solution.",
      "answer": "Specify the state space, initial state, applicable actions, transition model, goal test or goal states, and action cost function. A solution is a path from the initial state to a goal. Its cost is the sum of action costs; an optimal solution has the minimum cost among solutions.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "Problem components",
        "Goal-reaching path",
        "Additive cost and minimum-cost criterion"
      ]
    },
    {
      "id": "Q03",
      "section": "3.1",
      "type": "single-choice",
      "difficulty": "easy",
      "prompt": "When can a correct fixed action sequence be executed open-loop with the guarantee described in this chapter?",
      "answer": "A",
      "explanation": "The initial state and deterministic model allow all action outcomes to be predicted. If the model can be wrong, monitoring execution is safer.",
      "options": [
        {
          "id": "A",
          "text": "When the environment is fully observable, deterministic and known, and the model is correct"
        },
        {
          "id": "B",
          "text": "Whenever the agent has a heuristic"
        },
        {
          "id": "C",
          "text": "Whenever there is only one goal"
        },
        {
          "id": "D",
          "text": "Whenever the frontier is finite"
        }
      ]
    },
    {
      "id": "Q04",
      "section": "3.1.2",
      "type": "written",
      "difficulty": "medium",
      "prompt": "In route finding, why might the state be just the current city? When would fuel level also need to be included?",
      "answer": "The city-only representation abstracts away details irrelevant to available routes and their costs. Fuel must be included if it affects which journeys are possible or their costs. A useful abstraction simplifies planning while preserving executable solutions.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "Removes irrelevant details",
        "Retains information affecting actions/costs",
        "Abstract solutions must be realizable"
      ]
    },
    {
      "id": "Q05",
      "section": "3.2.1",
      "type": "numeric",
      "difficulty": "easy",
      "prompt": "A vacuum world has 4 cells. The agent occupies exactly one cell; each cell independently is clean or dirty. Orientation is not represented. How many states are there?",
      "answer": 64,
      "explanation": "There are 4 positions and 2^4 dirt configurations: 4 × 16 = 64.",
      "tolerance": 0
    },
    {
      "id": "Q06",
      "section": "3.2.1",
      "type": "written",
      "difficulty": "medium",
      "prompt": "Formulate an 8-puzzle search problem. State how many actions are legal when the blank is in a corner, an edge midpoint, or the center.",
      "answer": "States specify all eight tile positions and the blank. The initial state is the supplied board; the goal is a supplied target board. Actions move the blank up/down/left/right when legal, swapping it with the adjacent tile. Each move costs 1. The blank has 2 legal moves in a corner, 3 at an edge midpoint and 4 in the center.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "Full board state",
        "Legal blank swaps and goal",
        "Unit costs",
        "Action counts 2, 3, 4"
      ]
    },
    {
      "id": "Q07",
      "section": "3.2.1",
      "type": "written",
      "difficulty": "medium",
      "prompt": "How can a problem with only three action types have an infinite state space? Use the textbook’s number problem starting at 4.",
      "answer": "The operations are square root, floor and factorial (factorial only for integers). Repeated factorial applications to integers greater than 2 produce arbitrarily large values. A finite branching factor therefore does not imply a finite number of reachable states.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "Three operations",
        "Repeated factorial produces new values",
        "Finite branching is not finite state space"
      ]
    },
    {
      "id": "Q08",
      "section": "3.2.2",
      "type": "written",
      "difficulty": "medium",
      "prompt": "Why is current airport alone an insufficient state for airline itinerary search?",
      "answer": "The state also needs current time to determine which flights can be boarded and whether transfers are possible. Fare-related history may be needed when future prices or eligibility depend on earlier segments. Two visits to the same airport can therefore have different legal continuations or costs.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "Time and connections",
        "Relevant fare history",
        "State must determine future choices/costs"
      ]
    },
    {
      "id": "Q09",
      "section": "3.2.2",
      "type": "written",
      "difficulty": "medium",
      "prompt": "Compare ordinary route finding with a tour that must visit every required city and return to the start. What additional state information does the tour need?",
      "answer": "Ordinary route finding can use current city when costs and actions depend only on location. The tour also needs the set of already visited required cities; it reaches a goal after visiting all required cities and returning to the start. Two paths at the same city but with different visited sets represent different tour states.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "Current city plus visited set",
        "Correct goal condition",
        "Explains why histories matter"
      ]
    },
    {
      "id": "Q10",
      "section": "3.2.2",
      "type": "written",
      "difficulty": "medium",
      "prompt": "Give one modeling challenge for each of robot navigation, chip layout and automatic assembly sequencing.",
      "answer": "Robot navigation may require continuous positions and joint angles, with collision constraints. Chip layout must position components and route connections subject to space and performance constraints. Assembly sequencing must choose an order in which later parts remain installable; checking the geometric feasibility of an action can itself be expensive.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "One valid challenge for each of the three examples"
      ]
    },
    {
      "id": "Q11",
      "section": "3.3",
      "type": "written",
      "difficulty": "easy",
      "prompt": "Distinguish a state-space graph from a search tree. Can two search nodes represent the same state?",
      "answer": "The state-space graph represents states and legal transitions. The search tree represents paths generated from the initial state. Different paths can end in the same state, so different search nodes can share a state while having different parents and path costs.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "Graph represents states/transitions",
        "Tree represents paths",
        "Same state can occur in multiple nodes"
      ]
    },
    {
      "id": "Q12",
      "section": "3.3.2",
      "type": "written",
      "difficulty": "easy",
      "prompt": "What four fields does the textbook store in a search node, and how is a solution reconstructed?",
      "answer": "A node stores STATE, PARENT, ACTION and PATH-COST. Follow PARENT links from the goal to the initial node, collecting the actions, then reverse their order to obtain the start-to-goal action sequence.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "Four fields",
        "Follow parents and reverse actions"
      ]
    },
    {
      "id": "Q13",
      "section": "3.3",
      "type": "single-choice",
      "difficulty": "easy",
      "prompt": "Which statement correctly describes the frontier and the reached table?",
      "answer": "B",
      "explanation": "Discovery and expansion differ. A state can be recorded in reached while its node still waits in the frontier.",
      "options": [
        {
          "id": "A",
          "text": "Both contain only expanded states"
        },
        {
          "id": "B",
          "text": "The frontier holds nodes awaiting expansion; reached records states discovered so far, including frontier states"
        },
        {
          "id": "C",
          "text": "The frontier contains only goals"
        },
        {
          "id": "D",
          "text": "Reached contains only the current path"
        }
      ]
    },
    {
      "id": "Q14",
      "section": "3.3.1",
      "type": "written",
      "difficulty": "medium",
      "prompt": "A state X was reached with g=12. A new child reaches X with g=8. What should generic best-first graph search do, and why?",
      "answer": "Update reached[X] to the new cheaper node and add that node to the frontier (or update its priority if supported). Continuing from X can now yield cheaper descendant paths. If X was already expanded, reopening it can be necessary, for example with an inconsistent A* heuristic. Reject a new route with equal or greater cost.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "Update best route",
        "Queue or reopen the cheaper node",
        "Propagate improvements",
        "Ignore non-improvements"
      ]
    },
    {
      "id": "Q15",
      "section": "3.3.1",
      "type": "single-choice",
      "difficulty": "easy",
      "prompt": "Which value decides whether a new route improves a previously reached state, and which value orders the best-first frontier?",
      "answer": "C",
      "explanation": "Path improvements compare actual path cost g. The frontier is ordered by the chosen evaluation function f, which depends on the search algorithm.",
      "options": [
        {
          "id": "A",
          "text": "h improves; g orders"
        },
        {
          "id": "B",
          "text": "f improves; h orders"
        },
        {
          "id": "C",
          "text": "g improves; f orders"
        },
        {
          "id": "D",
          "text": "Depth improves; depth always orders"
        }
      ]
    },
    {
      "id": "Q16",
      "section": "3.3.3",
      "type": "written",
      "difficulty": "medium",
      "prompt": "Compare checking only for cycles on the current path with keeping a table of all reached states.",
      "answer": "Path-cycle checking rejects a successor already among its ancestors, using the current path. It does not detect two different acyclic paths to the same state. A reached table detects these more general repeated states and can keep the cheapest route, but may use much more memory.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "Cycle versus redundant path",
        "Reached detects cross-path repetition",
        "Memory tradeoff"
      ]
    },
    {
      "id": "Q17",
      "section": "3.3.4",
      "type": "written",
      "difficulty": "easy",
      "prompt": "Define completeness, cost optimality, time complexity and space complexity.",
      "answer": "Completeness asks whether a solution is guaranteed to be found if one exists and failure reported where that is possible. Cost optimality means returning a lowest-cost solution. Time measures computation, often nodes generated or expanded; space measures maximum memory used. On an infinite state space without a solution, a complete search need not terminate with failure.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "Four distinct measures",
        "Infinite no-solution qualification"
      ]
    },
    {
      "id": "Q18",
      "section": "3.3.4",
      "type": "written",
      "difficulty": "medium",
      "prompt": "Explain |V|, |E|, b, d and m, and when each style of complexity description is useful.",
      "answer": "For an explicitly supplied graph, |V| counts states and |E| counts transitions/state-action pairs. For implicitly generated search spaces, b bounds successors per node, d denotes solution depth (the shallowest goal depth for BFS comparisons), and m is maximum search-tree path depth. A cycle can make m infinite if repetitions are permitted even when |V| is finite. With unequal costs, cheapest and shallowest solutions can differ.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "Explicit graph counts",
        "Implicit width/depth parameters",
        "Cycles and infinite m",
        "Depth is not cost"
      ]
    },
    {
      "id": "Q19",
      "section": "3.4",
      "type": "single-choice",
      "difficulty": "easy",
      "prompt": "Match frontier structures to BFS, DFS and uniform-cost search.",
      "answer": "B",
      "explanation": "FIFO gives shallowest-first traversal, LIFO gives deepest-first traversal, and priority by g gives cheapest-path-first traversal.",
      "options": [
        {
          "id": "A",
          "text": "BFS: stack; DFS: queue; UCS: queue"
        },
        {
          "id": "B",
          "text": "BFS: FIFO queue; DFS: LIFO stack; UCS: priority queue ordered by g"
        },
        {
          "id": "C",
          "text": "All use FIFO queues"
        },
        {
          "id": "D",
          "text": "BFS: priority by h; DFS: priority by g; UCS: stack"
        }
      ]
    },
    {
      "id": "Q20",
      "section": "3.4.1",
      "type": "trace",
      "difficulty": "medium",
      "prompt": "Use this directed tree: S has children A then B; A has children C then D; B has children E then G; C has child F. D, E, F and G have no children. G is the only goal. All edges cost 1. Use the specified left-to-right child order. Run BFS with goal testing when children are generated. List expanded nodes and the returned path.",
      "answer": "Expanded nodes: S, A, B. S generates A,B. A generates C,D. B generates E and then G, so the search returns S → B → G, cost 2. C,D,E,G are not expanded before termination.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "Expanded S,A,B",
        "Goal tested on generation",
        "Path S,B,G; cost 2"
      ]
    },
    {
      "id": "Q21",
      "section": "3.4.3",
      "type": "trace",
      "difficulty": "medium",
      "prompt": "Use this directed tree: S has children A then B; A has children C then D; B has children E then G; C has child F. D, E, F and G have no children. G is the only goal. All edges cost 1. Use the specified left-to-right child order. Run recursive-style DFS, exploring the first child completely before the next. Test for a goal on entering a node. List entered nodes and the returned path.",
      "answer": "Entered nodes: S, A, C, F, D, B, E, G. The returned path is S → B → G, cost 2. G is goal-tested but not expanded. With an explicit stack, push children in reverse order to obtain this traversal.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "Order S,A,C,F,D,B,E,G",
        "Backtracks after F and D",
        "Returned path S,B,G"
      ]
    },
    {
      "id": "Q22",
      "section": "3.4.1",
      "type": "single-choice",
      "difficulty": "easy",
      "prompt": "BFS finds a shallowest goal. Under what standard condition does this also guarantee a cheapest solution?",
      "answer": "B",
      "explanation": "Equal action costs make total cost proportional to depth. With unequal costs, fewer actions can be more expensive.",
      "options": [
        {
          "id": "A",
          "text": "A heuristic is admissible"
        },
        {
          "id": "B",
          "text": "All actions have the same positive cost"
        },
        {
          "id": "C",
          "text": "The goal is on the left"
        },
        {
          "id": "D",
          "text": "The graph has no cycles"
        }
      ]
    },
    {
      "id": "Q23",
      "section": "3.4.1",
      "type": "written",
      "difficulty": "medium",
      "prompt": "Derive BFS time and space complexity with maximum branching factor b≥2 and a shallowest goal at depth d. Use early goal testing.",
      "answer": "A uniform tree has up to 1+b+b^2+...+b^d nodes through depth d. The sum is O(b^d). Generating those nodes gives O(b^d) time under constant per-node work. The frontier and, for graph search, reached information can also require O(b^d) memory. Early testing avoids expanding depth-d non-goals before detecting a generated goal.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "Geometric sum",
        "O(b^d) time",
        "O(b^d) space",
        "Early goal-test convention"
      ]
    },
    {
      "id": "Q24",
      "section": "3.4.1",
      "type": "numeric",
      "difficulty": "easy",
      "prompt": "A full search tree has branching factor 3. How many nodes, including the root, are there through depth 4?",
      "answer": 121,
      "explanation": "1 + 3 + 9 + 27 + 81 = 121. This is a full-tree count, not a claim that every BFS run visits all these nodes.",
      "tolerance": 0
    },
    {
      "id": "Q25",
      "section": "3.4.2",
      "type": "trace",
      "difficulty": "medium",
      "prompt": "Use this directed weighted graph, with no other edges: S→A:2, S→B:1, A→G:2, B→G:10. S is the start and G the only goal. Generate successors alphabetically; break equal priorities alphabetically by state. For cost-based searches, accept a goal only when it is removed as the minimum-priority frontier node. Trace uniform-cost search: list removed states with g-values and give the solution.",
      "answer": "Removed nodes: S(0), B(1), A(2), G(4). Expanding B first discovers G at cost 11; expanding A improves G to cost 4. Return S → A → G with cost 4. An obsolete G(11) entry, if retained, is never used before termination.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "Removal order and g-values",
        "G improved from 11 to 4",
        "Correct path"
      ]
    },
    {
      "id": "Q26",
      "section": "3.4.2",
      "type": "written",
      "difficulty": "medium",
      "prompt": "Use this directed weighted graph, with no other edges: S→A:2, S→B:1, A→G:2, B→G:10. S is the start and G the only goal. Generate successors alphabetically; break equal priorities alphabetically by state. For cost-based searches, accept a goal only when it is removed as the minimum-priority frontier node. Why would stopping at the first generated goal be wrong for uniform-cost search?",
      "answer": "After expanding S, UCS expands B at cost 1 and generates G at cost 11. Stopping there returns 11, even though S → A → G costs 4. Wait until a goal is removed as the minimum-g frontier node.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "First discovered goal costs 11",
        "Better solution costs 4",
        "Goal test on removal"
      ]
    },
    {
      "id": "Q27",
      "section": "3.4.2",
      "type": "written",
      "difficulty": "hard",
      "prompt": "Explain why uniform-cost search returns an optimal solution with nonnegative action costs.",
      "answer": "When a goal of cost C is removed, every other frontier node has g≥C. Extending a path cannot reduce its cost with nonnegative edges. Every not-yet-explored better solution would need a frontier prefix cheaper than C, contradicting selection of the goal. This is an optimality argument; termination on infinite spaces needs additional assumptions.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "Minimum g",
        "Extensions cannot reduce cost",
        "Frontier prefix contradiction"
      ]
    },
    {
      "id": "Q28",
      "section": "3.4.2",
      "type": "written",
      "difficulty": "hard",
      "prompt": "Why does the textbook require finite branching and an action-cost lower bound ε>0 for the usual completeness guarantee of UCS? State its implicit-space time/space bound.",
      "answer": "A positive lower bound prevents infinitely many steps from having bounded total cost. With finite branching, only finitely many nodes can lie below a fixed solution-cost threshold. The usual worst-case time and space bound is O(b^(1+floor(C*/ε))), where C* is optimal solution cost. Arbitrarily small positive costs alone do not provide this guarantee.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "Finite nodes below a cost threshold",
        "ε excludes indefinitely shrinking costs",
        "Correct bound"
      ]
    },
    {
      "id": "Q29",
      "section": "3.4.3",
      "type": "written",
      "difficulty": "medium",
      "prompt": "Why can tree-like DFS fail to find an existing solution? How does graph-search DFS change the finite-state case?",
      "answer": "Tree-like DFS can follow an infinite branch or repeat a cycle forever while ignoring another branch with a goal. With a reached set, DFS is complete on finite state spaces because each reachable state need only be explored once. DFS does not generally minimize depth or path cost.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "Infinite branch/cycle",
        "Reached-set finite-state completeness",
        "Not generally optimal"
      ]
    },
    {
      "id": "Q30",
      "section": "3.4.3",
      "type": "written",
      "difficulty": "medium",
      "prompt": "Explain O(b^m) time and O(bm) space for ordinary tree-like DFS on a finite search tree. Why can backtracking use O(m) space?",
      "answer": "DFS may visit the whole tree through depth m, giving O(b^m) time for b>1. It retains a path plus unvisited siblings at each level, using O(bm) space. Backtracking that generates one successor at a time and modifies/undoes the current state avoids storing all siblings and can use O(m) state/path information.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "Whole tree worst case",
        "Path plus siblings",
        "One-successor backtracking saves memory"
      ]
    },
    {
      "id": "Q31",
      "section": "3.4.4",
      "type": "written",
      "difficulty": "medium",
      "prompt": "Distinguish cutoff from failure in depth-limited search. What if the shallowest goal depth is 5 but the limit is 3?",
      "answer": "Cutoff means the depth limit prevented further exploration, so deeper solutions may exist. Failure means the explored search has exhausted the relevant possibilities without a solution and without truncation. A limit of 3 cannot reach a goal at depth 5; truncating a continuing branch yields cutoff. Iterative deepening increases the limit after cutoff.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "Cutoff leaves deeper possibilities",
        "Failure indicates exhaustion",
        "Limit 3 insufficient"
      ]
    },
    {
      "id": "Q32",
      "section": "3.4.4",
      "type": "written",
      "difficulty": "medium",
      "prompt": "How does iterative deepening work, and why can it be efficient despite revisiting shallow nodes?",
      "answer": "Run depth-limited DFS at limits 0,1,2,... until a solution is found or genuine failure occurs. In a branching tree most nodes are at the deepest level, so repeating the small upper levels adds only a constant-factor overhead for b>1. Time is O(b^d), space O(bd), and with equal positive action costs it is cost-optimal.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "Increasing limits",
        "Deepest level dominates",
        "Correct time/space",
        "Equal-cost optimality"
      ]
    },
    {
      "id": "Q33",
      "section": "3.4.4",
      "type": "numeric",
      "difficulty": "medium",
      "prompt": "A full binary tree is searched to limits 0,1,2,3 by iterative deepening. Assume every iteration visits its entire tree through the limit (no early stop). Count node visits across all iterations, including repeated visits and the root.",
      "answer": 26,
      "explanation": "Visits: 1 + (1+2) + (1+2+4) + (1+2+4+8) = 1+3+7+15 = 26.",
      "tolerance": 0
    },
    {
      "id": "Q34",
      "section": "3.4.5",
      "type": "written",
      "difficulty": "medium",
      "prompt": "Explain bidirectional search, its idealized O(b^(d/2)) advantage, and two practical requirements.",
      "answer": "Search forward from the start and backward from known goal states, joining compatible paths when the searches meet. Each side ideally explores depth about d/2, giving roughly 2b^(d/2) rather than b^d. It requires usable goal states/backward initialization and efficient generation of predecessors, plus detection of meetings. A meeting gives a candidate; use the algorithm’s correct stopping rule to guarantee optimality.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "Two directions",
        "Half-depth exponential advantage",
        "Backward/goal access",
        "Meeting and stopping rule"
      ]
    },
    {
      "id": "Q35",
      "section": "3.4.6",
      "type": "written",
      "difficulty": "medium",
      "prompt": "Choose and justify an uninformed search for each: (a) equal costs, unknown shallow goal depth, little memory; (b) differing positive costs and required optimality; (c) equal costs, ample memory, shallow goal.",
      "answer": "(a) Iterative deepening: shallowest solution with low memory. (b) Uniform-cost search: chooses minimum accumulated cost and is optimal under the usual assumptions. (c) BFS: explores shallow levels first and is optimal with equal costs. Other choices need explicit tradeoff justification.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "IDS for a",
        "UCS for b",
        "BFS for c"
      ]
    },
    {
      "id": "Q36",
      "section": "3.5",
      "type": "single-choice",
      "difficulty": "easy",
      "prompt": "Which mapping of evaluation functions is correct?",
      "answer": "B",
      "explanation": "g is cost already paid; h estimates remaining cost. A* combines both.",
      "options": [
        {
          "id": "A",
          "text": "UCS: h; greedy: g; A*: g+h"
        },
        {
          "id": "B",
          "text": "UCS: g; greedy: h; A*: g+h"
        },
        {
          "id": "C",
          "text": "UCS: g+h; greedy: h; A*: g"
        },
        {
          "id": "D",
          "text": "All use h"
        }
      ]
    },
    {
      "id": "Q37",
      "section": "3.5.1",
      "type": "trace",
      "difficulty": "medium",
      "prompt": "Use this directed weighted graph, with no other edges: S→A:2, S→B:1, A→G:2, B→G:10. S is the start and G the only goal. Generate successors alphabetically; break equal priorities alphabetically by state. For cost-based searches, accept a goal only when it is removed as the minimum-priority frontier node. Set h(S)=4, h(A)=2, h(B)=1, h(G)=0. Trace greedy best-first search using f=h.",
      "answer": "Removed nodes: S(h=4), B(h=1), G(h=0). Return S → B → G at cost 11, although cost 4 is possible via A. Greedy chooses the smallest estimated remaining cost and ignores the path cost already incurred. These h-values are admissible, but that does not make greedy search optimal.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "S,B,G",
        "Cost 11 vs optimum 4",
        "Greedy ignores g"
      ]
    },
    {
      "id": "Q38",
      "section": "3.5.2",
      "type": "trace",
      "difficulty": "hard",
      "prompt": "Use this directed weighted graph, with no other edges: S→A:2, S→B:1, A→G:2, B→G:10. S is the start and G the only goal. Generate successors alphabetically; break equal priorities alphabetically by state. For cost-based searches, accept a goal only when it is removed as the minimum-priority frontier node. Set h(S)=4, h(A)=2, h(B)=1, h(G)=0. Trace A*, giving (g,h,f) when each node is removed.",
      "answer": "Removed: S(0,4,4), B(1,1,2), A(2,2,4), G(4,0,4). B generates G with g=f=11. A then improves it to g=f=4. Return S → A → G, cost 4. The heuristic is admissible but inconsistent on S→B, so f can decrease from S to B.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "Correct removal order and scores",
        "G improvement",
        "Optimal path",
        "Recognizes f decrease"
      ]
    },
    {
      "id": "Q39",
      "section": "3.5.2",
      "type": "single-choice",
      "difficulty": "easy",
      "prompt": "What does admissibility mean, using h*(n) for the actual cheapest remaining cost?",
      "answer": "C",
      "explanation": "An admissible heuristic never overestimates the true remaining cost. We use nonnegative heuristics and h(goal)=0 throughout this bank.",
      "options": [
        {
          "id": "A",
          "text": "h(n) is always larger than h*(n)"
        },
        {
          "id": "B",
          "text": "h(n)=g(n)"
        },
        {
          "id": "C",
          "text": "h(n)≤h*(n) for every n"
        },
        {
          "id": "D",
          "text": "h(n) must be zero everywhere"
        }
      ]
    },
    {
      "id": "Q40",
      "section": "3.5.2",
      "type": "written",
      "difficulty": "hard",
      "prompt": "Give the consistency inequality for an edge n→n′ of cost c. Explain its relation to admissibility.",
      "answer": "Consistency requires h(n)≤c(n,n′)+h(n′) for every edge, with h(goal)=0. Repeatedly applying this inequality along a path to a goal shows h(n) is no greater than that path’s cost, hence no greater than the cheapest goal-path cost. Consistency implies admissibility; the converse need not hold.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "Correct inequality",
        "Goal value zero",
        "Telescoping/path argument",
        "Converse false"
      ]
    },
    {
      "id": "Q41",
      "section": "3.5.2",
      "type": "written",
      "difficulty": "hard",
      "prompt": "Graph: S→A costs 2, A→G costs 2, S→G costs 5. No other edges. Let h(S)=4, h(A)=1, h(G)=0. Is h admissible? Is it consistent?",
      "answer": "It is admissible: true remaining costs are h*(S)=4, h*(A)=2, h*(G)=0. It is inconsistent on S→A because 4 > 2+1. The other edges satisfy consistency.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "True costs 4,2,0",
        "Admissible everywhere",
        "Names violating edge and inequality"
      ]
    },
    {
      "id": "Q42",
      "section": "3.5.2",
      "type": "written",
      "difficulty": "hard",
      "prompt": "Prove why A* with an admissible heuristic cannot return a suboptimal goal. State the goal-test and repeated-state assumptions.",
      "answer": "Let optimal cost be C*. Until an optimal goal is selected, a frontier prefix n of an optimal path has f(n)=g*(n)+h(n)≤g*(n)+h*(n)=C*. A suboptimal goal G has f(G)=g(G)>C*, since h(G)=0. A* selects minimum f, so it cannot select G first. Test goals on removal, and permit cheaper-path updates/reopening when needed; admissibility alone is insufficient for graph search that permanently closes every expanded state.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "Frontier optimal-path prefix",
        "f(n)≤C*",
        "Goal f equals cost",
        "Minimum-f contradiction",
        "Goal on removal and reopening"
      ]
    },
    {
      "id": "Q43",
      "section": "3.5.2",
      "type": "trace",
      "difficulty": "hard",
      "prompt": "Graph: S→A:3, S→B:1, B→A:1, A→G:3. Heuristic: h(S)=5, h(A)=0, h(B)=4, h(G)=0. No other edges. Compare A* that reopens improved states with a variant that never reopens an expanded state.",
      "answer": "Initial priorities after S are A:f=3 and B:f=5. Expand A(g=3), generating G(g=6). Expand B(g=1), finding A at g=2. Correct A* reopens A with f=2, improves G to g=5, and returns S→B→A→G, cost 5. A variant ignoring the improved already-expanded A returns G at cost 6. h is admissible but inconsistent on B→A because 4>1+0.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "Expansion order A then B",
        "Improved A g=2",
        "Reopening returns 5",
        "No reopening can return 6",
        "Inconsistent B→A"
      ]
    },
    {
      "id": "Q44",
      "section": "3.5.3",
      "type": "written",
      "difficulty": "medium",
      "prompt": "What is a search contour? For A* with a consistent heuristic and optimal cost C*, describe nodes with f<C*, f=C* and f>C*.",
      "answer": "A contour groups nodes with equal evaluation value f=g+h. Consistency makes f nondecreasing along paths. Reachable search nodes with f<C* lie within the contours that must be explored, subject to duplicate pruning; some nodes with f=C* are considered according to tie-breaking. Nodes with f>C* are not expanded before the optimal goal is returned. These are cost contours, not depth levels.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "Equal-f grouping",
        "Consistency/monotonicity",
        "Three regions",
        "Cost differs from depth"
      ]
    },
    {
      "id": "Q45",
      "section": "3.5.3",
      "type": "written",
      "difficulty": "hard",
      "prompt": "Derive why consistency implies f does not decrease from n to its child n′.",
      "answer": "g(n′)=g(n)+c(n,n′). Therefore f(n′)=g(n)+c(n,n′)+h(n′)≥g(n)+h(n)=f(n), using h(n)≤c(n,n′)+h(n′). Admissibility alone does not establish this one-edge inequality.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "Correct g relation",
        "Uses consistency",
        "f(n′)≥f(n)"
      ]
    },
    {
      "id": "Q46",
      "section": "3.5.2",
      "type": "single-choice",
      "difficulty": "easy",
      "prompt": "What does A* become when h(n)=0 for every node?",
      "answer": "C",
      "explanation": "Then f(n)=g(n), exactly the UCS ordering.",
      "options": [
        {
          "id": "A",
          "text": "Depth-first search"
        },
        {
          "id": "B",
          "text": "Greedy best-first search"
        },
        {
          "id": "C",
          "text": "Uniform-cost search"
        },
        {
          "id": "D",
          "text": "Iterative deepening"
        }
      ]
    },
    {
      "id": "Q47",
      "section": "3.5.4",
      "type": "numeric",
      "difficulty": "easy",
      "prompt": "Weighted A* uses f(n)=g(n)+W h(n). For g=8, h=5 and W=2, calculate f.",
      "answer": 18,
      "explanation": "8 + 2×5 = 18. W=1 gives ordinary A*.",
      "tolerance": 0
    },
    {
      "id": "Q48",
      "section": "3.5.4",
      "type": "written",
      "difficulty": "medium",
      "prompt": "Explain the speed/quality tradeoff in weighted A*. If W=1.5 and C*=40, what upper bound applies under the usual weighted-A* assumptions?",
      "answer": "Weighting an admissible h by W>1 favors estimated proximity to a goal more strongly and often reduces search, but can return a nonoptimal solution. With admissible base h, h(goal)=0, proper cheaper-path handling and goal testing on removal, the standard bound is C≤W C*=60; also C≥40. Faster performance is a tendency, not a guarantee on every instance.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "Weighted evaluation",
        "Possible speed versus optimality tradeoff",
        "Cost interval 40 to 60",
        "Conditions for bound"
      ]
    },
    {
      "id": "Q49",
      "section": "3.5.4",
      "type": "written",
      "difficulty": "medium",
      "prompt": "Distinguish bounded-suboptimal, bounded-cost and unbounded-cost search. Which category includes speedy search?",
      "answer": "Bounded-suboptimal search guarantees C≤W C* for a fixed factor W. Bounded-cost search seeks a solution below a specified absolute cost limit. Unbounded-cost search accepts any solution cost to prioritize finding a solution quickly. Speedy search is unbounded-cost: it estimates remaining action count, ignoring differences in action costs.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "Relative versus absolute bound",
        "Unbounded accepts any cost",
        "Speedy uses action count"
      ]
    },
    {
      "id": "Q50",
      "section": "3.6",
      "type": "written",
      "difficulty": "medium",
      "prompt": "Define the misplaced-tile and Manhattan-distance heuristics for a unit-cost sliding-tile puzzle. Why is the blank excluded?",
      "answer": "Misplaced tiles counts numbered tiles not at their goal positions. Manhattan distance sums |row−goal row|+|column−goal column| over numbered tiles. Every misplaced tile must move; each legal move shifts exactly one numbered tile by one square, giving lower bounds. Counting blank distance as well can double-count the work of a move and overestimate.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "Both definitions",
        "Exclude blank",
        "Lower-bound reasoning"
      ]
    },
    {
      "id": "Q51",
      "section": "3.6",
      "type": "calculation",
      "difficulty": "medium",
      "prompt": "Use rows as follows. Goal: [1,2,3] / [4,5,6] / [7,8,0]. Start: [1,2,3] / [5,0,6] / [4,7,8]. Here 0 is the blank. Compute misplaced tiles h1 and Manhattan distance h2, excluding 0.",
      "answer": "h1=4: tiles 4,5,7,8 are misplaced. h2=4: tile 4 is one row from its goal, tile 5 one column, tile 7 one column and tile 8 one column. All other numbered tiles contribute zero.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "Misplaced set 4,5,7,8",
        "h1=4",
        "h2=4 with contributions"
      ]
    },
    {
      "id": "Q52",
      "section": "3.6.1",
      "type": "single-choice",
      "difficulty": "easy",
      "prompt": "If admissible h2 dominates admissible h1, which inequality holds at every state?",
      "answer": "B",
      "explanation": "A dominating admissible heuristic gives a larger or equal lower bound everywhere, so it is at least as informative.",
      "options": [
        {
          "id": "A",
          "text": "h2(n)≤h1(n)"
        },
        {
          "id": "B",
          "text": "h2(n)≥h1(n)"
        },
        {
          "id": "C",
          "text": "h2(n)>h*(n)"
        },
        {
          "id": "D",
          "text": "h2(n)=0"
        }
      ]
    },
    {
      "id": "Q53",
      "section": "3.6.1",
      "type": "written",
      "difficulty": "medium",
      "prompt": "Does a dominating heuristic always make A* faster in wall-clock time? Explain.",
      "answer": "No. With consistent heuristics, dominance reduces or preserves the set of nodes that must be expanded below the optimal-cost contour; ties on the boundary can affect counts. Computing a stronger heuristic may itself take longer, so fewer expansions need not mean less elapsed time.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "Distinguishes node count and computation time",
        "Tie caveat",
        "Stronger heuristic can cost more"
      ]
    },
    {
      "id": "Q54",
      "section": "3.6.1",
      "type": "numeric",
      "difficulty": "medium",
      "prompt": "A search generates N=14 nodes excluding the root and returns a solution at depth d=3. Find b* from N+1=1+b*+(b*)^2+(b*)^3.",
      "answer": 2,
      "explanation": "15=1+2+4+8, so b*=2. This is an equivalent uniform-tree branching factor, not a claim that every actual node has two children.",
      "tolerance": 0.001
    },
    {
      "id": "Q55",
      "section": "3.6.1",
      "type": "written",
      "difficulty": "medium",
      "prompt": "Under the generated-search-node convention N+1=Σ(i=0..d)(b*)^i, why is b*≥1 when d>0? When is equality attained?",
      "answer": "A returned path of d actions contains d non-root search nodes, all of which had to be generated, so N≥d. At b*=1 the sum is d+1; for 0≤b*<1 it is smaller than d+1. Thus b*≥1, with equality exactly when N=d. Unequal edge costs do not alter this counting argument. If d=0, the equation does not determine b*.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "N≥d",
        "Sum at 1 equals d+1",
        "Equality for path-only generation",
        "d=0 is indeterminate"
      ]
    },
    {
      "id": "Q56",
      "section": "3.6.1",
      "type": "calculation",
      "difficulty": "medium",
      "prompt": "Two heuristics solve the same unit-cost instance at depth 3. One generates 14 nodes excluding the root, the other 39. Compare their effective branching factors.",
      "answer": "For N=14: 15=1+2+4+8, so b*=2. For N=39: 40=1+3+9+27, so b*=3. The first search explores fewer alternatives on this instance. This does not by itself compare heuristic-computation time.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "b*=2 and 3",
        "Lower value means less node-generation work"
      ]
    },
    {
      "id": "Q57",
      "section": "3.6.2",
      "type": "written",
      "difficulty": "medium",
      "prompt": "What is a relaxed problem, and why does its exact optimal cost give an admissible heuristic for the original problem?",
      "answer": "A relaxation removes action restrictions while retaining the goal and original action costs. Every original solution remains possible, while additional shortcuts may become possible. Therefore the relaxed optimal remaining cost cannot exceed the original optimal remaining cost. Computing the relaxed optimum must also be cheap enough to be useful.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "Removes restrictions",
        "Preserves original solutions/costs",
        "Lower-bound argument",
        "Computational usefulness"
      ]
    },
    {
      "id": "Q58",
      "section": "3.6.2",
      "type": "written",
      "difficulty": "medium",
      "prompt": "For sliding tiles, which relaxations lead to (a) Manhattan distance and (b) misplaced tiles?",
      "answer": "(a) Allow a tile to move to an adjacent square even if occupied: each numbered tile can independently move along a shortest grid path. (b) Allow a tile to move directly to any square, regardless of adjacency or occupancy: each misplaced numbered tile can be placed in one move. These are relaxed mathematical models, not legal moves of the original puzzle.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "Adjacent but occupancy ignored for Manhattan",
        "Adjacency and occupancy ignored for misplaced"
      ]
    },
    {
      "id": "Q59",
      "section": "3.6.2",
      "type": "single-choice",
      "difficulty": "easy",
      "prompt": "Two admissible heuristics give h1(n)=6 and h2(n)=9. Which combination is guaranteed admissible for all states?",
      "answer": "C",
      "explanation": "The maximum is still no greater than the true remaining cost because each component is a lower bound. A sum can double-count: if the true cost is 10, admissible values 6 and 9 sum to 15.",
      "options": [
        {
          "id": "A",
          "text": "h1+h2"
        },
        {
          "id": "B",
          "text": "2h2"
        },
        {
          "id": "C",
          "text": "max(h1,h2)"
        },
        {
          "id": "D",
          "text": "h1+h2+1"
        }
      ]
    },
    {
      "id": "Q60",
      "section": "3.6.2",
      "type": "written",
      "difficulty": "hard",
      "prompt": "Show that the maximum of consistent heuristics is consistent.",
      "answer": "Let h(n)=max_i h_i(n), and choose j attaining that maximum at n. Then h(n)=h_j(n)≤c(n,n′)+h_j(n′)≤c(n,n′)+max_i h_i(n′)=c(n,n′)+h(n′). Goal values remain zero.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "Select maximizing index at parent",
        "Apply component consistency",
        "Bound child component by maximum"
      ]
    },
    {
      "id": "Q61",
      "section": "3.6.6",
      "type": "written",
      "difficulty": "medium",
      "prompt": "How can solved search problems supply training data for a heuristic, and what guarantee can be lost?",
      "answer": "Optimal solutions provide states with known optimal remaining costs (including suffixes of optimal paths). A model can learn to predict remaining cost for new states from their descriptions or features. Prediction errors can overestimate, so learned heuristics are not automatically admissible or consistent. There is a tradeoff among training effort, search time and solution quality.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "Optimal remaining-cost examples",
        "Generalization using features",
        "No automatic admissibility/consistency",
        "Tradeoffs"
      ]
    },
    {
      "id": "Q62",
      "section": "3.6.6",
      "type": "numeric",
      "difficulty": "easy",
      "prompt": "A learned heuristic is h(n)=2x1(n)+3x2(n). If x1=4 and x2=2, what is h(n)?",
      "answer": 14,
      "explanation": "2×4 + 3×2 = 14. A numerical prediction alone does not establish admissibility.",
      "tolerance": 0
    },
    {
      "id": "Q63",
      "section": "3.6.6",
      "type": "single-choice",
      "difficulty": "easy",
      "prompt": "A learned heuristic is zero at every goal. Does this alone prove admissibility?",
      "answer": "B",
      "explanation": "Zero at goals is necessary under our convention, but admissibility also requires h(n)≤h*(n) at every other state. Learned heuristics may or may not meet that requirement.",
      "options": [
        {
          "id": "A",
          "text": "Yes, because only goal values matter"
        },
        {
          "id": "B",
          "text": "No, it may overestimate at other states"
        },
        {
          "id": "C",
          "text": "Yes, if the coefficients are positive"
        },
        {
          "id": "D",
          "text": "No heuristic learned from data can ever be admissible"
        }
      ]
    },
    {
      "id": "Q64",
      "section": "3.4–3.6",
      "type": "written",
      "difficulty": "hard",
      "prompt": "You need cheapest paths in a finite graph with positive costs. An inexpensive admissible heuristic is available but may be inconsistent. Choose an algorithm and specify the repeated-state and stopping rules.",
      "answer": "Use A* with f=g+h, a minimum-priority frontier and a table of cheapest reached g-values. When a cheaper path is found, update the record and queue/reopen the state even if previously expanded. Skip obsolete queue entries as appropriate. Return a goal only when it is removed with minimum current priority. If no heuristic were available, UCS (h=0) is a valid optimal alternative.",
      "explanation": "Use the model answer and checklist to assess your reasoning.",
      "keyPoints": [
        "A* g+h",
        "Cheapest-g table",
        "Reopen cheaper paths",
        "Goal on removal"
      ]
    }
  ]
}
```
