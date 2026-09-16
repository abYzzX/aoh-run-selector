# Contributing to AOH Run Selector

Read `AOH-RULES.md`, `AGENT.md`, `EXTENSION-DESIGN.md`, and `CHANGELOG.md` before making changes.

Keep changes focused and preserve the extension's use of VS Code launch configurations and APIs. Do not introduce parallel configuration formats or broad abstractions for small problems.

## Development

Install dependencies and run the tests before submitting a change:

```bash
npm install
npm test
```

Use `npm run compile` for a compile-only check. Add tests for new or changed pure logic where practical.

## Documentation

User-visible changes must be recorded under `Unreleased` in `CHANGELOG.md`. Update `README.md` when usage changes and `EXTENSION-DESIGN.md` when architecture, constraints, or deliberate behavior changes.

## License

Contributions are provided under the repository's MIT license.
