# Claude Code Instructions

Project-specific instructions for Claude Code.

## Commits

- Use **conventional commits**: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`, `style:`
- Keep commit messages concise (50 char subject line)
- No emoji in commits

## Code Style

- TypeScript strict mode
- Prefer explicit types over inference for function signatures
- Use NestJS conventions (modules, services, controllers)

## Task Management

- Track tasks in `tasks/todo.md`
- Log lessons learned in `tasks/lessons.md`
- Follow SKILLS.md methodology

## Project Structure

- This repo is **backend only** (NestJS API + Python analysis workers)
- Reference architecture in `ARCHITECTURE.md`
- Do not create frontend code here

## Data Sources

Read from `/Users/aaron/Documents/projects/alerter/` for reference implementations of data adapters (Python).
