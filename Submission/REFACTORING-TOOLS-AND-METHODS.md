# Refactoring Tools and Methods

## Tools Used

I used **Visual Studio Code (VS Code)** as my primary development environment for refactoring the code. VS Code provides built-in refactoring capabilities and extensions that make it easier to safely restructure code.

## Refactoring Methods Applied

### Method 1: Extract Hook Pattern

The main refactoring technique I used was the **Extract Hook** pattern. This is a React-specific refactoring method where I identified code that handled a specific concern (like token management, data fetching, or autosave logic) and moved it into a custom hook.

**How it works:**
1. I identified a block of code in the component that handled one specific responsibility
2. I selected that code and created a new file for a custom hook
3. I moved the state and logic into the hook
4. I replaced the original code with a call to the new hook

**Example:** The token management code that was mixed in the gratitude component was extracted into `useAuthToken` hook. Instead of having token loading logic directly in the component, the component now simply calls `useAuthToken()` and gets the token and loading state back.

### Method 2: Standardize Naming Convention

Another refactoring method I applied was **Standardize Naming Convention**. This involved ensuring consistent property names and contracts across the codebase.

**How it works:**
1. I identified inconsistent naming patterns (like `req.user.id` vs `req.userId`)
2. I chose one standard pattern to use throughout
3. I used VS Code's "Find and Replace" feature to update all occurrences
4. I verified that all references were updated consistently

**Example:** In the auth middleware and mood controller, some code was using `req.userId` while other code used `req.user.id`. I standardized everything to use `req.user.id` consistently, making the codebase easier to understand and maintain.

## VS Code Features Used

While refactoring, I made use of several VS Code features:

- **Find and Replace (Ctrl/Cmd + H):** Used to rename variables and update references across multiple files
- **Go to Definition (F12):** Used to navigate to where functions and variables were defined to understand dependencies
- **Multi-cursor editing:** Used to make the same change in multiple places simultaneously
- **File explorer:** Used to organize extracted code into new hook files in the `hooks/` folder
- **Integrated terminal:** Used to run tests after each refactoring step to ensure nothing broke

## Refactoring Process

The refactoring process followed these steps:

1. **Identify the problem:** I looked for code that mixed multiple concerns or had inconsistent patterns
2. **Plan the extraction:** I decided which code should be moved into separate hooks or functions
3. **Extract incrementally:** I moved one concern at a time, testing after each extraction
4. **Update references:** I updated all places that used the old code to use the new hooks
5. **Verify with tests:** I ran the test suite to make sure everything still worked correctly

This approach ensured that the refactoring was safe and didn't break existing functionality.

