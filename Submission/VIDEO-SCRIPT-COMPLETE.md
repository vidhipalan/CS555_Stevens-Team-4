# Complete Video Script: Smelly Code → Refactored Code

## Video Structure (2-3 minutes total)

---

## Part 1: Introduction (10 seconds)

"Hi, I'm going to show you a bad smell I found in my code, demonstrate that it works with tests, then show you how I refactored it."

---

## Part 2: Show Smelly Code (30 seconds)

"Let me start with the smelly code. I'll open the auth middleware file."

[Open: `Submission/Refactoring/backend/src/middleware/auth.smelly.js`]

"Here's the problem. Look at lines 15 and 16. The middleware sets both `req.user.id` and `req.userId`. This creates an inconsistent contract."

[Point to lines 15-16 with cursor]

"Now let me show you how this causes issues in the controller."

[Open: `Submission/Refactoring/backend/src/controllers/moodController.smelly.js`]

"Look at line 79. The `getAllPatientsMoods` function uses `req.userId`, but other functions like `getByDate` on line 23 use `req.user.id`. This inconsistency makes the code fragile."

[Point to line 79, then line 23]

---

## Part 3: Run Tests for Smelly Code (20 seconds)

"Even though this is smelly code, it still works. Let me run the tests to show you."

[Open terminal in VS Code]

[Type: `cd backend`]

[Type: `npm test -- tests/middleware.test.js --runInBand`]

[Wait for tests to run]

"As you can see, the tests pass. The code works, but it's not maintainable because of the inconsistency."

[Point to test results showing "Tests: X passed"]

---

## Part 4: Show Refactored Code (30 seconds)

"Now let me show you the refactored version. I've fixed this by standardizing everything."

[Open: `Submission/backend/src/middleware/auth.js`]

"Look at line 27. Now the middleware only sets `req.user.id`. There's no more `req.userId`."

[Point to line 27]

"And in the controller..."

[Open: `Submission/backend/src/controllers/moodController.js`]

"All functions now use `req.user.id` consistently. Look at line 73 - `getAllPatientsMoods` now uses `req.user.id` just like all the other functions."

[Point to line 73, then scroll to show other functions using `req.user.id`]

"This makes the code much more maintainable. There's a single, consistent contract throughout."

---

## Part 5: Run Tests for Refactored Code (20 seconds)

"Let me run the tests again to show that the refactored code still works correctly."

[In terminal, type: `npm test -- tests/middleware.test.js tests/mood.test.js --runInBand`]

[Wait for tests to run]

"Perfect! All tests pass. The refactored code works exactly the same as before, but now it's consistent and easier to maintain."

[Point to test results showing "Tests: X passed"]

---

## Part 6: Conclusion (10 seconds)

"To summarize: I found an inconsistent authentication contract where different parts of the code used different property names. I fixed it by standardizing everything to use `req.user.id`. The functionality remains the same, but the code is now much more maintainable."

---

## Quick Reference: What to Show

### Files to Open:
1. `Submission/Refactoring/backend/src/middleware/auth.smelly.js` (lines 15-16)
2. `Submission/Refactoring/backend/src/controllers/moodController.smelly.js` (line 79 vs line 23)
3. `Submission/backend/src/middleware/auth.js` (line 27)
4. `Submission/backend/src/controllers/moodController.js` (line 73)

### Commands to Run:
1. `cd backend`
2. `npm test -- tests/middleware.test.js --runInBand` (for smelly code)
3. `npm test -- tests/middleware.test.js tests/mood.test.js --runInBand` (for refactored code)

### Key Points to Mention:
- "Inconsistent contract" or "inconsistent property names"
- "Some code uses req.user.id, other code uses req.userId"
- "Standardized to use req.user.id"
- "Tests still pass"
- "More maintainable"

