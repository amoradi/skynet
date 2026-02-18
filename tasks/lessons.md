# Lessons Learned

Corrections and insights captured during development.

---

## Session Log

### 2025-02-18: Project Setup
**Issue**: Confusion about which directory to work in
**Fix**: Clarified that `/skynet` is the main repo, `/alerter` is reference only
**Lesson**: Confirm working directory before starting any work

### 2025-02-18: Stack Decision
**Issue**: Initially said "Next.js" when user meant "NestJS"
**Fix**: User corrected, NestJS is for API layer
**Lesson**: NestJS (Node.js API framework) ≠ Next.js (React framework). Read carefully.

### 2025-02-18: Hybrid Architecture
**Decision**: NestJS for API + Python for analysis
**Rationale**: scipy/pandas have no good TypeScript alternatives for statistical analysis
**Lesson**: Use the right tool for each layer, don't force single-language stack
