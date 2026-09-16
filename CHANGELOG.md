# Changelog

All notable user-visible changes to AOH Run Selector are documented here.

## [Unreleased]

### Added

- Repository-level development, design, contribution, and agent documentation.
- Unit tests for launch-choice identity, duplicate detection, and status-bar label escaping.

### Changed

- Extracted small VS Code-independent helpers so core behavior can be tested directly.
- CI and release infrastructure is kept outside the extension repository.

## [1.3.3]

### Changed

- Build now runs only the selected launch configuration's `preLaunchTask`.
- Building no longer invokes VS Code's workspace-wide Build Task picker/action.
- Run/Debug selection remains unchanged and independent from Build.

## [1.3.0]

### Changed

- Embedded the custom AOH build hammer directly in Run Selector.
- Removed the dependency on AOH Extra Icons.

## [1.2.1]

- Previous release.
