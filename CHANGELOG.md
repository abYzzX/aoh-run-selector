# Changelog

All notable user-visible changes to AOH Run Selector are documented here.

## 0.1.5

- Update icon

## 0.1.4

- Run Selected Configuration now starts the selected application as a normal process in an integrated terminal instead of going through VS Code's debug API with `noDebug`. Running no longer starts `vsdbg`; only Debug Selected Configuration uses the debugger.
- Normal Run executes the selected configuration's `preLaunchTask` before launch and supports both `program`-based and C# Dev Kit `projectPath` launch configurations.
- Stop and Restart now also track normal non-debug runs.

## 0.1.3

- Cleanup; Marketplace release

## 0.1.2

- Restart and Restart in Debug Mode actions for the selected running launch configuration.
- Status-bar controls now reflect whether the selected configuration is running.
- Stop and restart actions target sessions belonging to the selected configuration.
- Restart waits for the existing sessions to terminate before launching in the requested mode and prevents duplicate restart requests.

## 0.1.1

- Repository-level development, design, contribution, and agent documentation.
- Unit tests for launch-choice identity, duplicate detection, and status-bar label escaping.

- Extracted small VS Code-independent helpers so core behavior can be tested directly.
- CI and release infrastructure is kept outside the extension repository.

## 0.0.3

- Build now runs only the selected launch configuration's `preLaunchTask`.
- Building no longer invokes VS Code's workspace-wide Build Task picker/action.
- Run/Debug selection remains unchanged and independent from Build.

## 0.0.2

- Embedded the custom AOH build hammer directly in Run Selector.
- Removed the dependency on AOH Extra Icons.

## 0.0.1

- Previous release.
