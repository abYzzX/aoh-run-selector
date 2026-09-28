# Changelog

All notable user-visible changes to AOH Run Selector are documented here.

## [0.1.2]

### Added

- Restart and Restart in Debug Mode actions for the selected running launch configuration.

### Changed

- Status-bar controls now reflect whether the selected configuration is running.
- Stop and restart actions target sessions belonging to the selected configuration.
- Restart waits for the existing sessions to terminate before launching in the requested mode and prevents duplicate restart requests.

## [0.1.1]

### Added

- Repository-level development, design, contribution, and agent documentation.
- Unit tests for launch-choice identity, duplicate detection, and status-bar label escaping.

### Changed

- Extracted small VS Code-independent helpers so core behavior can be tested directly.
- CI and release infrastructure is kept outside the extension repository.

## [0.0.3]

### Changed

- Build now runs only the selected launch configuration's `preLaunchTask`.
- Building no longer invokes VS Code's workspace-wide Build Task picker/action.
- Run/Debug selection remains unchanged and independent from Build.

## [0.0.2]

### Changed

- Embedded the custom AOH build hammer directly in Run Selector.
- Removed the dependency on AOH Extra Icons.

## [0.0.1]

- Previous release.
