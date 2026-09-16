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
- Stop the active debug session directly from the status bar
- Remembers the selected configuration per workspace
- Uses VS Code's normal debugging API

## Usage

The status bar shows the currently selected launch configuration. Use the selector to choose another configuration from the workspace's `.vscode/launch.json` file.

The Build action runs only the selected configuration's `preLaunchTask`; it does not start or switch the launch configuration. The Run and Debug actions start that configuration through VS Code's standard debugging infrastructure. While a debug session is active, the launcher exposes a Stop action instead.

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
