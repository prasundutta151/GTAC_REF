# Guidelines & Rules for Coding Agents

This document defines mandatory guidelines for all AI coding assistants (Gemini, Codex, Claude, Cursor, Copilot, etc.) and human developers contributing to the **GTAC Referee Form (`GTAC_REF`)** project.

---

## 1. Developer Log Maintenance (`dev/DEV_NOTES.md`)

Whenever a user request or task is given:
1. **Freshen Up the Prompt**: Clean up, structure, and refine the raw prompt into an unambiguous, professional specification.
2. **Append to `dev/DEV_NOTES.md`**: Add a new entry to the log using the established project schema:

```markdown
## YYYY-MM-DD HH:MM:SS TZ

Prompt / Request
- Refined and structured description of the requested task.

Changes Made
- Concrete summary of code, configuration, or documentation modifications.

Verification
- Exact commands, tests, or inspection steps executed to verify correctness.

Notes
- Relevant context, edge cases, follow-ups, or cautions.
```

---

## 2. Code Style & Naming Conventions

All new code and modifications must strictly conform to existing codebase patterns:

1. **Language & Environment**:
   - Python 3.9+ compatible.
   - Always include `from __future__ import annotations` at the top of Python modules.
   - Use standard library modules whenever possible (`pathlib.Path`, `argparse`, `json`, `subprocess`, `sys`, `shutil`, `typing`).

2. **File Naming & Executables**:
   - Primary CLI tool is `util` without `.py` extension.
   - CLI scripts must begin with `#!/usr/bin/env python3` and maintain executable permissions.

3. **Variable & Function Naming**:
   - **Functions & Methods**: `snake_case` (e.g. `load_version()`, `bump_version()`, `project_root()`).
   - **Variables & Arguments**: `snake_case` (e.g. `workdir`, `current_branch`, `tar_path`).
   - **Constants & Configuration Sets**: `UPPER_SNAKE_CASE` (e.g. `PROJECT_NAME`, `DEFAULT_BRANCH`).
   - **Classes**: `PascalCase`.

4. **Type Annotations**:
   - Use comprehensive type annotations on all function signatures (`Path`, `Dict[str, object]`, `List[str]`, `str | None`, `bool`).

5. **Robust File Operations**:
   - Use `pathlib.Path` for filesystem operations.
   - Use atomic write patterns (write to `.tmp` then `replace`) when saving sensitive files.

6. **CLI Standards**:
   - Use `argparse` with descriptive flag names (e.g. `--version`, `--git-push`, `--change-branch`, `--release`, `--status`).
   - Provide clear, user-friendly help strings and stdout status formatting.

---

## 3. Multi-Agent Coordination & Safety (.agent_lock Protocol)

To prevent simultaneous execution, race conditions, and broken Git states when working with multiple AI agents:

1. **The `.agent_lock` Protocol**:
   - The root file `.agent_lock` acts as a mutual-exclusion lock for all coding agents and Git operations.
   - **Default / Idle State (`True`)**: By default, when no agent is actively executing, `.agent_lock` contains `True` (meaning available / unlocked).
   - **Acquiring the Lock (`False`)**: Whenever an agent begins a task or prompt:
     - Check `.agent_lock`.
     - If it is `True`, immediately set the file content to `False` to signal that an agent is actively working.
     - If it is `False`, another agent is currently running; wait or abort to avoid conflicts.
   - **Releasing the Lock (`True`)**: When the agent finishes its task, verifications, and documentation updates, it must reset `.agent_lock` back to `True`.

2. **Git & Pipeline Operations**:
   - The same `.agent_lock` check applies to any Git commands (`git add`, `git commit`, `git checkout`, `git push`) to guarantee mutual exclusion.

3. **Sequential Execution & Fresh State**:
   - Always operate sequentially, never running prompts in parallel across multiple tools.
   - Read fresh file contents from disk before making edits to avoid stale context.
   - Create clean Git commits before switching tools.

4. **Git Staging & Release Tar Boundaries**:
   - The `dev/` directory (including `DEV_NOTES.md` and scratch scripts) is tracked in Git and staged/committed whenever Git actions (`util --git-push`, `git add`) are performed.
   - The `dev/` directory is **strictly excluded** from release distribution archives created when `--release` is run (`versions/GTAC_REF-*.tar.gz`).

---

## 4. Development Workspace Boundaries

To ensure seamless developer workflow while maintaining strict workspace security:

1. **Workspace Boundary**:
   - Work is strictly confined to the project directory (`/Users/prasun/Documents/GTAC/Referee_Form`).
   - Modifying, reading, or executing files outside this directory is prohibited without explicit instruction.
2. **Designated Development Folder**:
   - All active development and exploratory code should reside within `dev/`.
