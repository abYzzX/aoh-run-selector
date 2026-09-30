# AOH Run Selector — Extension Design

## Goal

Provide a small, persistent status-bar launcher for projects that use several VS Code launch configurations. The extension removes repeated navigation through the Run and Debug view without replacing VS Code's own launch/debug infrastructure.

## Non-goals

- Replacing `launch.json` with a custom configuration format.
- Implementing a debugger or process manager.
- Providing a general-purpose task runner.
- Reproducing the complete Run and Debug view in the status bar.

## Sources of truth

Launch configurations come from VS Code's `launch` configuration. Folder-scoped configurations are collected for workspace folders; workspace-level configurations are considered for multi-root/workspace-file scenarios. The selected configuration key is stored in workspace state.

## Status-bar model

The extension creates separate status-bar items for Build, Run, Debug, configuration selection, and Stop. Separate items keep each action independently visible and allow the selected configuration label to change dynamically.

When no debug session is active, a valid selection exposes Run and Debug. While a session is active, Run and Debug are hidden and Stop is shown.

### Planned restart control

When a configuration is running, Restart should be shown in addition to Stop. Restart must terminate the current session and start the same selected launch configuration again in the same mode: normal Run remains Run and Debug remains Debug.

## Build behavior

Build executes only the selected configuration's `preLaunchTask`. It resolves the task through VS Code's task API and prefers a task in the selected configuration's workspace folder. Missing `preLaunchTask` or task resolution is reported to the user rather than falling back to a workspace-wide build action.

## Run and Debug behavior

Run and Debug deliberately use different execution paths. **Run must never call `vscode.debug.startDebugging`**: it executes the selected configuration's `preLaunchTask` and then starts the configured application as a normal integrated-terminal process. A DLL `program` is started with `dotnet <program>`, an executable `program` is started directly, and C# Dev Kit `projectPath` configurations use `dotnet run --project <projectPath>`. This guarantees that Run does not start `vsdbg`. Debug alone uses `vscode.debug.startDebugging` and therefore the debugger declared by the launch configuration.

## Selection behavior

The selected launch configuration is stored per workspace. If it disappears, the extension selects the first available configuration. Changes to launch configuration or workspace folders trigger validation and UI refresh.

## Test strategy

Pure behavior is extracted from VS Code-dependent orchestration where useful. Unit tests currently cover launch-choice key generation, duplicate detection for workspace launch configurations, and status-bar text escaping. VS Code API integration remains intentionally thin rather than being hidden behind a large mock framework.

## Release infrastructure

Release/CI infrastructure is not part of this extension repository. The repository contains source, tests, package metadata, and project documentation only. Shared build/release infrastructure is managed outside the extension repository.

## Known limitations

Normal runs are tracked by their integrated terminal; debug runs are tracked by VS Code debug sessions. Stop and Restart operate on whichever execution mode is active for the selected configuration.
