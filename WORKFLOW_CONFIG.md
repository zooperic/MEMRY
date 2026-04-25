# MEMRY Development Workflow Config

**Version:** 1.0  
**Created:** April 25, 2026  
**Purpose:** Standardize Claude session workflow with branch-based PRs

---

## Session Workflow (Branch + PR Model)

### **Session Start Procedure**

```bash
# 1. Clone fresh copy
cd /home/claude
git clone https://github.com/EricBrianAnil/MEMRY.git
cd MEMRY

# 2. Create feature branch with descriptive name
# Format: <type>/<short-description>
# Types: feat, fix, docs, refactor, test, chore
git checkout -b fix/responsive-layout

# Example branch names:
# - feat/photo-manager
# - fix/upload-error-handling
# - docs/update-architecture
# - refactor/dashboard-components
```

### **During Session**

- Work normally in the feature branch
- Commit incrementally if desired:
  ```bash
  git add <files>
  git commit -m "WIP: descriptive message"
  ```
- No need to push mid-session

### **Session End Procedure**

```bash
# 1. Stage all changes
git add .

# 2. Check what's staged (recommended)
git status

# 3. Commit with conventional commit message
git commit -m "<type>: <subject>

<body>

<footer>"

# Example:
git commit -m "fix: resolve responsive layout issues on desktop

- Remove maxWidth: 1400 constraint in DashboardGrid
- Convert sidebar marginLeft to flexbox layout
- Add comprehensive breakpoint system (mobile/tablet/desktop/wide)
- Make stats grid responsive with auto-fit minmax
- Add proper sidebar positioning via CSS
- Scale padding on ultrawide displays with clamp()

Resolves: #123
Improves: Desktop UX on wide monitors"

# 4. Push to remote feature branch
git push origin fix/responsive-layout

# 5. Output PR creation command for user
echo "=========================================="
echo "Create PR via GitHub CLI (if installed):"
echo "gh pr create --title 'Fix: Responsive layout issues' --body 'Detailed description...'"
echo ""
echo "OR create PR manually:"
echo "https://github.com/EricBrianAnil/MEMRY/compare/main...fix/responsive-layout"
echo "=========================================="
```

---

## Commit Message Format

Follow **Conventional Commits** standard:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### **Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, no logic change)
- `refactor`: Code restructuring (no feature/bug change)
- `test`: Adding/updating tests
- `chore`: Maintenance (deps, build, etc.)
- `perf`: Performance improvement

### **Examples:**

```bash
# Feature
git commit -m "feat(photo-manager): add bulk delete functionality

Allows users to select multiple photos and delete in one action.
Includes confirmation modal to prevent accidental deletion.

Closes: #45"

# Bug fix
git commit -m "fix(upload): handle network errors gracefully

Added retry mechanism and user-facing error messages.
Prevents silent failures during image upload.

Fixes: #67"

# Documentation
git commit -m "docs(readme): update deployment instructions

Clarified Vercel setup steps and environment variables.
Added troubleshooting section for common issues."
```

---

## Branch Naming Convention

```
<type>/<short-description>
```

### **Types:**
- `feat/` — New feature
- `fix/` — Bug fix
- `docs/` — Documentation
- `refactor/` — Code refactoring
- `test/` — Testing
- `chore/` — Maintenance

### **Examples:**
- `feat/contributor-invites`
- `fix/mobile-upload-crash`
- `docs/api-endpoints`
- `refactor/dashboard-layout`
- `test/image-pipeline`
- `chore/update-dependencies`

---

## PR Template

When creating PR, use this structure:

```markdown
## Description
Brief summary of changes and motivation.

## Changes
- Bullet point list of what changed
- Include file names if helpful

## Testing
- [ ] Tested locally
- [ ] Verified on mobile
- [ ] Checked responsive breakpoints
- [ ] No console errors

## Screenshots (if UI changes)
[Add screenshots here]

## Related Issues
Closes #123
Relates to #456

## Notes
Any additional context or follow-up items.
```

---

## File Organization

### **Modified Files Location:**
After session, modified files are copied to `/mnt/user-data/outputs/memry-session-files/` for easy local testing.

### **Documentation Location:**
- `RESPONSIVE_FIXES.md` — Technical change log
- `NEXT_STEPS.md` — Roadmap breakdown
- `SESSION_END_COMMANDS.md` — Git commands reference
- `WORKFLOW_CONFIG.md` — This file

---

## Git Configuration (One-time Setup)

If using this workflow regularly, configure git identity:

```bash
git config --global user.name "Claude AI"
git config --global user.email "claude@anthropic.com"

# Or use your identity
git config --global user.name "Eric Brian Anil"
git config --global user.email "your-email@example.com"
```

---

## Branch Protection Rules (Recommended)

**On GitHub repository settings:**

1. **Protect `main` branch:**
   - Require pull request reviews before merging
   - Require status checks to pass (if CI/CD setup)
   - Require conversation resolution before merging

2. **Auto-delete head branches:**
   - Enable "Automatically delete head branches" after PR merge
   - Keeps repository clean

3. **Squash merge (optional):**
   - Enable squash commits for cleaner history
   - Keeps main branch linear

---

## CI/CD Integration (Future)

When ready to add automated checks:

```yaml
# .github/workflows/pr-checks.yml
name: PR Checks

on:
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run lint
      
  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run type-check
      
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
```

---

## Rollback Procedure

If PR causes issues after merge:

```bash
# Option 1: Revert the merge commit
git revert -m 1 <merge-commit-hash>
git push origin main

# Option 2: Reset to previous state (destructive, use carefully)
git reset --hard <previous-commit-hash>
git push --force origin main

# Option 3: Create fix PR (preferred)
git checkout -b fix/revert-issue
# Make fixes
git push origin fix/revert-issue
# Create PR to fix the issue
```

---

## Quick Reference

### **Start Session:**
```bash
git clone https://github.com/EricBrianAnil/MEMRY.git
cd MEMRY
git checkout -b <type>/<description>
```

### **End Session:**
```bash
git add .
git commit -m "<type>: <subject>"
git push origin <branch-name>
# Create PR on GitHub
```

### **Test Locally:**
Modified files are in `/mnt/user-data/outputs/memry-session-files/`

---

## Notes

- **No direct pushes to `main`** — always use PR workflow
- **Branch lifespan:** Delete after PR merge
- **Commit frequency:** Commit incrementally or all at once — your choice
- **PR size:** Aim for focused PRs (one feature/fix per PR)
- **Review process:** Self-review before creating PR, merge when confident

---

**This workflow ensures:**
✅ Every change is reviewed before merging  
✅ Clean git history with atomic commits  
✅ Easy rollback if issues arise  
✅ Clear documentation of what changed and why  
✅ No accidental direct pushes to production code
