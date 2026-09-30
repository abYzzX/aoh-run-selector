# AOH - Run Selector

AOH - Run Selector provides a compact status-bar interface for selecting and launching VS Code debug configurations.

It is intended for projects with several launch configurations where repeatedly opening the Run and Debug view becomes unnecessary friction.

## Features

- Permanently visible run/debug control in the status bar
- Displays the currently selected launch configuration
- Quick selection of configurations from `launch.json`
- Build the selected configuration by running its `preLaunchTask`
- Start the selected configuration in Run mode
- Start the selected configuration in Debug mode
- Stop the selected running configuration directly from the status bar
- Restart the selected running configuration with or without debugging
- Remembers the selected configuration per workspace
- Run starts the selected application without a debugger; Debug uses VS Code's normal debugging API

## Usage

The status bar shows the currently selected launch configuration. Use the selector to choose another configuration from the workspace's `.vscode/launch.json` file.

The Build action runs only the selected configuration's `preLaunchTask`; it does not start or switch the launch configuration. Run executes the selected configuration's `preLaunchTask` and starts the application normally in an integrated terminal, without `vsdbg`. Debug starts the selected configuration through VS Code's debugging infrastructure. While the selected configuration is running, the launcher exposes Stop, Restart (without debugging), and Restart in Debug Mode actions. Restart waits for the existing session to terminate before launching the selected configuration in the requested mode.

## Configuration

AOH - Run Selector uses the launch configurations already defined by VS Code. No separate run configuration format is required.

Example:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Application",
      "type": "coreclr",
      "request": "launch",
      "program": "${workspaceFolder}/bin/Debug/net10.0/Application.dll"
    }
  ]
}
```

## Requirements

- Visual Studio Code
- At least one launch configuration in `.vscode/launch.json`
- A `preLaunchTask` on a launch configuration if it should be buildable from the status bar
- The debugger extension required by the selected launch configuration

## Development

Install dependencies and run the test suite:

```bash
npm install
npm test
```

`npm test` compiles the extension and runs the VS Code-independent unit tests with Node's built-in test runner.

## Project documentation

- `AOH-RULES.md` — shared rules used across AOH extension repositories
- `AGENT.md` — project-specific instructions for coding agents
- `EXTENSION-DESIGN.md` — architecture, behavior, constraints, and deliberate design decisions
- `CONTRIBUTING.md` — contribution workflow
- `CHANGELOG.md` — released and unreleased user-visible changes

## License

MIT. See `LICENSE`.
