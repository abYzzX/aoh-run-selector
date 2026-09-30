# Agent Instructions — AOH Run Selector

Read `AOH-RULES.md`, `EXTENSION-DESIGN.md`, and the `Unreleased` section of `CHANGELOG.md` before changing the extension.

## Project purpose

AOH Run Selector provides compact Rider-style launch controls in the VS Code status bar while continuing to use VS Code launch configurations, tasks, and debugging APIs.

## Project-specific rules

- Do not introduce a second run-configuration format. `.vscode/launch.json` remains the source of truth.
- Build means executing the selected launch configuration's `preLaunchTask`; it must not silently invoke an unrelated workspace build.
- Run and Debug are intentionally different: Run must never use `vscode.debug.startDebugging` or start `vsdbg`; it starts the selected application as a normal process after its `preLaunchTask`. Debug uses VS Code's debugging API.
- Keep the status-bar UI compact and predictable.
- Selection is workspace-scoped and must remain valid when launch configuration or workspace folders change.
- Multi-root workspace behavior must not collapse distinct folder-scoped launch configurations.
- Keep logic that does not require the VS Code API in small pure modules so it can be tested without mocking VS Code.
- Add or update tests for changed pure behavior.

## Current planned behavior

A running configuration exposes Stop and Restart controls. Restart must work for both normal Run and Debug and restart the same selected configuration in the requested mode. Normal Run processes are tracked separately from debug sessions.

## Documentation

User-visible changes belong under `Unreleased` in `CHANGELOG.md`. Keep `README.md` user-facing and update `EXTENSION-DESIGN.md` when architecture or deliberate behavior changes.
