# Refactoring Documentation - Individual Assignment 02

**Course**: CS555 - Agile Methods for Software Development
**Student**: Shiv Vyas
**Date**: November 11, 2025
**Assignment**: Practice Refactoring - Code Smell Elimination

---

## Executive Summary

This document details the identification and refactoring of two distinct code smells in our Mental Health Tracker application. The refactoring process was performed using VS Code as the primary tool, applying industry-standard refactoring techniques to improve code maintainability, reduce duplication, and enhance overall code quality.

---

## Code Smell #1: Duplicate Validation Logic

### Location
**Files Affected:**
- `backend/src/controllers/gratitudeController.js`

### Description of the Code Smell

**Type**: Duplicate Code (Violates DRY Principle)

The same validation logic for content and title length checking appeared in two separate functions:

1. **createGratitudeEntry** function (lines 87-95)
2. **updateGratitudeEntry** function (lines 136-144)

**Original Smelly Code:**
```javascript
// In createGratitudeEntry
// Validate content length
if (content && content.length > 2000) {
  return res.status(400).json({ error: 'Content exceeds 2000 character limit' });
}

// Validate title length
if (title && title.length > 100) {
  return res.status(400).json({ error: 'Title exceeds 100 character limit' });
}

// Same code duplicated in updateGratitudeEntry
// Validate content length
if (content && content.length > 2000) {
  return res.status(400).json({ error: 'Content exceeds 2000 character limit' });
}

// Validate title length
if (title && title.length > 100) {
  return res.status(400).json({ error: 'Title exceeds 100 character limit' });
}
```

### Problems with the Smelly Code

1. **Maintenance Burden**: If validation rules change (e.g., character limits), updates must be made in multiple places
2. **Inconsistency Risk**: Changes in one location might be forgotten in another
3. **Code Bloat**: Unnecessary repetition increases file size and complexity
4. **Violation of DRY**: Don't Repeat Yourself principle is violated

### Refactoring Method Applied

**Method**: **Extract Method** (Refactoring Technique)

This is a fundamental refactoring technique where duplicate code is extracted into a separate, reusable function.

### Refactored Code

**Step 1: Created Helper Function**
```javascript
// REFACTORED: Extracted validation logic into a helper function
const validateGratitudeInput = (title, content) => {
  const errors = [];

  if (content && content.length > 2000) {
    errors.push('Content exceeds 2000 character limit');
  }

  if (title && title.length > 100) {
    errors.push('Title exceeds 100 character limit');
  }

  return errors.length > 0 ? errors : null;
};
```

**Step 2: Replaced Duplicate Code**
```javascript
// In createGratitudeEntry
// REFACTORED: Using extracted validation function instead of duplicate code
const validationErrors = validateGratitudeInput(title, content);
if (validationErrors) {
  return res.status(400).json({ error: validationErrors[0] });
}

// In updateGratitudeEntry
// REFACTORED: Using extracted validation function instead of duplicate code
const validationErrors = validateGratitudeInput(title, content);
if (validationErrors) {
  return res.status(400).json({ error: validationErrors[0] });
}
```

### Benefits of Refactoring

1. **Single Source of Truth**: Validation logic exists in one place
2. **Easy Maintenance**: Changes need to be made only once
3. **Better Testability**: The validation function can be tested independently
4. **Improved Readability**: Intent is clearer with a named function
5. **Reduced Code Size**: ~10 lines reduced to 3 lines at each usage point

---

## Code Smell #2: Duplicate Authorization Check

### Location
**Files Affected:**
- `backend/src/controllers/authController.js`
- `backend/src/controllers/moodController.js`
- `backend/src/controllers/gratitudeController.js`

### Description of the Code Smell

**Type**: Duplicate Code + Scattered Authorization Logic

The same clinician role authorization check appeared in three different controllers:

**Original Smelly Code:**
```javascript
// In authController.js - getAllPatients
const requestingUser = await User.findById(req.user.id);
if (!requestingUser || requestingUser.role !== 'clinician') {
  return res.status(403).json({ error: 'Access denied. Clinicians only.' });
}

// In moodController.js - getAllPatientsMoods
const requestingUser = await User.findById(req.user.id);
if (!requestingUser || requestingUser.role !== 'clinician') {
  return res.status(403).json({ error: 'Access denied. Clinicians only.' });
}

// In gratitudeController.js - getAllPatientsGratitude
const requestingUser = await User.findById(req.user.id);
if (!requestingUser || requestingUser.role !== 'clinician') {
  return res.status(403).json({ error: 'Access denied. Clinicians only.' });
}
```

### Problems with the Smelly Code

1. **Authorization Scattered**: Security logic spread across multiple controllers
2. **Inconsistency Risk**: Different implementations might handle edge cases differently
3. **Hard to Audit**: Security checks are difficult to review when scattered
4. **Maintenance Nightmare**: Security policy changes require updates in multiple files
5. **Mixing Concerns**: Controllers handle both authorization and business logic

### Refactoring Method Applied

**Methods**: **Extract Method** + **Middleware Pattern** (Design Pattern)

This combines two techniques:
1. **Extract Method**: Pull out duplicate authorization code
2. **Middleware Pattern**: Apply Express.js middleware pattern for cross-cutting concerns

### Refactored Code

**Step 1: Created Middleware File**

Created `backend/src/middleware/roleAuth.js`:
```javascript
const User = require('../models/User');

/**
 * REFACTORED: Middleware for role-based authorization
 *
 * Refactoring Method: Extract Method + Middleware Pattern
 * Benefits:
 * - Single source of truth for clinician authorization
 * - Easier to maintain and update
 * - Follows DRY principle
 * - Can be reused for other roles in the future
 */
const requireClinician = async (req, res, next) => {
  try {
    const requestingUser = await User.findById(req.user.id);

    if (!requestingUser || requestingUser.role !== 'clinician') {
      return res.status(403).json({ error: 'Access denied. Clinicians only.' });
    }

    next();
  } catch (error) {
    console.error('Role authorization error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { requireClinician };
```

**Step 2: Updated Routes to Use Middleware**

```javascript
// In authRoutes.js
const { requireClinician } = require('../middleware/roleAuth');
router.get('/patients', authMiddleware, requireClinician, authController.getAllPatients);

// In moodRoutes.js
const { requireClinician } = require('../middleware/roleAuth');
router.get('/all-patients', auth, requireClinician, moodController.getAllPatientsMoods);

// In gratitudeRoutes.js
const { requireClinician } = require('../middleware/roleAuth');
router.get('/all-patients', requireClinician, getAllPatientsGratitude);
```

**Step 3: Simplified Controllers**

```javascript
// In authController.js - getAllPatients
// REFACTORED: Removed duplicate clinician authorization check
// Authorization is now handled by requireClinician middleware in routes
exports.getAllPatients = async (req, res) => {
  try {
    // Get all patients
    const patients = await User.find({ role: 'patient' }).select('-password');
    res.json(patients);
  } catch (error) {
    console.error('Get all patients error:', error);
    res.status(500).json({ error: 'Error fetching patients' });
  }
};
```

### Benefits of Refactoring

1. **Separation of Concerns**: Authorization logic separated from business logic
2. **Centralized Security**: All authorization in one place for easy auditing
3. **Reusability**: Middleware can be applied to any route needing clinician access
4. **Scalability**: Easy to add other role-based middleware (requireAdmin, requirePatient)
5. **Cleaner Controllers**: Controllers focus on business logic only
6. **Better Error Handling**: Centralized error handling for authorization failures
7. **Express.js Best Practice**: Follows Node.js/Express middleware pattern

---

## Tools and Refactoring Actions

### Primary Tool: **Visual Studio Code (VS Code)**

VS Code was used as the primary refactoring tool for this assignment.

### Refactoring Actions/Methods Used

#### 1. **Extract Method** (Used for both Code Smells)

**VS Code Features Utilized:**
- **Multi-cursor Editing**: Selected duplicate code blocks simultaneously using `Ctrl+D`
- **Code Snippets**: Created reusable code templates for the new functions
- **Find and Replace**: Used `Ctrl+H` to find duplicate patterns
- **IntelliSense**: Verified function signatures and parameters
- **Go to Definition (F12)**: Navigated between function definitions and usages

**Steps Taken:**
1. Identified duplicate code patterns using VS Code's search functionality
2. Created new function/middleware with appropriate name
3. Used multi-cursor editing to replace all instances
4. Verified no regressions with IntelliSense auto-completion

#### 2. **Inline Comments and Documentation**

**VS Code Features Utilized:**
- **JSDoc Comments**: Added structured documentation
- **Markdown Preview**: Previewed documentation files
- **Code Folding**: Organized large files by folding sections

**Steps Taken:**
1. Added descriptive comments explaining the refactoring
2. Documented the "before" (smelly code) with markers
3. Documented the "after" (refactored code) with explanations

#### 3. **Move Method/Extract Class** (Design Pattern Application)

**VS Code Features Utilized:**
- **File Explorer**: Created new middleware directory structure
- **Import Auto-completion**: Automatically updated import statements
- **Symbol Rename (F2)**: Ensured consistent naming

**Steps Taken:**
1. Created `roleAuth.js` middleware file
2. Moved authorization logic from controllers to middleware
3. Updated all import statements across affected files

---

## Testing Results

### Test Framework: **Jest with Supertest**

Comprehensive test suite created in `backend/tests/gratitude.test.js`:
- 15 test cases covering both code smells
- Tests for validation logic (Code Smell #1)
- Tests for authorization logic (Code Smell #2)

### Test Results - Smelly Code

**File**: `backend/test-results-smelly-code.txt`

```
Test Suites: 1 passed, 1 total
Tests:       15 passed, 15 total
Snapshots:   0 total
Time:        11.506 s
```

**All tests passed** ✅

### Test Results - Refactored Code

**File**: `backend/test-results-refactored-code.txt`

```
Test Suites: 1 passed, 1 total
Tests:       15 passed, 15 total
Snapshots:   0 total
Time:        11.783 s
```

**All tests passed** ✅

### Verification

The refactoring was successful as:
1. All 15 tests pass with both smelly and refactored code
2. Behavior is identical (same test results)
3. Code is cleaner and more maintainable
4. No regressions introduced

---

## Files Submitted

### Original Smelly Code (With Code Smell Markers)
1. `backend/src/controllers/gratitudeController_SMELLY.js` - Contains Code Smell #1
2. `backend/src/controllers/authController_SMELLY.js` - Contains Code Smell #2
3. `backend/src/controllers/moodController_SMELLY.js` - Contains Code Smell #2

### Refactored Code
1. `backend/src/controllers/gratitudeController.js` - Refactored with Extract Method
2. `backend/src/controllers/authController.js` - Refactored with Middleware Pattern
3. `backend/src/controllers/moodController.js` - Refactored with Middleware Pattern
4. `backend/src/middleware/roleAuth.js` - **NEW FILE** - Extracted middleware

### Route Files (Updated for Middleware)
1. `backend/src/routes/authRoutes.js`
2. `backend/src/routes/moodRoutes.js`
3. `backend/src/routes/gratitudeRoutes.js`

### Test Files
1. `backend/tests/gratitude.test.js` - Comprehensive test suite (15 tests)
2. `backend/test-results-smelly-code.txt` - Test output for smelly code
3. `backend/test-results-refactored-code.txt` - Test output for refactored code

### Documentation
1. `REFACTORING_DOCUMENTATION.md` - This document

---

## Summary of Refactoring Methods

### Code Smell #1: Duplicate Validation Logic
- **Refactoring Method**: Extract Method
- **Tool**: VS Code
- **Actions**: Multi-cursor editing, Find and Replace, IntelliSense
- **Lines Reduced**: ~18 lines of duplicate code → 3 lines per usage
- **Maintainability**: Improved significantly

### Code Smell #2: Duplicate Authorization Check
- **Refactoring Method**: Extract Method + Middleware Pattern
- **Tool**: VS Code
- **Actions**: File creation, Move method, Symbol rename, Import management
- **Lines Reduced**: ~21 lines of duplicate code (3 locations × 7 lines)
- **Security**: Centralized and improved
- **Scalability**: Can easily add more role-based middleware

---

## Conclusion

This refactoring exercise successfully identified and eliminated two distinct code smells in the Mental Health Tracker application. By applying the **Extract Method** refactoring technique and the **Middleware Pattern**, we achieved:

1. **Cleaner Code**: Reduced duplication and improved readability
2. **Better Maintainability**: Single source of truth for validation and authorization
3. **Improved Separation of Concerns**: Business logic separated from cross-cutting concerns
4. **Enhanced Testability**: Extracted functions can be tested independently
5. **No Regressions**: All tests pass before and after refactoring

The use of **VS Code** as the refactoring tool, with features like multi-cursor editing, IntelliSense, and symbol renaming, made the refactoring process efficient and error-free.

---

## References

- Fowler, M. (2018). *Refactoring: Improving the Design of Existing Code*. Addison-Wesley Professional.
- Martin, R. C. (2008). *Clean Code: A Handbook of Agile Software Craftsmanship*. Prentice Hall.
- Express.js Middleware Documentation: https://expressjs.com/en/guide/using-middleware.html
- Visual Studio Code Documentation: https://code.visualstudio.com/docs
