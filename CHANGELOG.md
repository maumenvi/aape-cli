# Changelog (Maia CLI)

All notable changes to the Maia CLI are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Added `maia list-tools [query]` (alias: `maia discover [query]`) as a first-pass capability discovery command.
- `maia list-tools` now shows:
  - configured registries;
  - installed entries (skills, MCPs, and tools);
  - local registry inventory.
- `maia list-tools <query>` now also discovers remote catalog matches for skills and MCPs.
- Added a built-in `read_file` tool for workspace-local file reads, materialized as part of the CLI tool registry flow.

### Changed
- Reduced the repository to the CLI-essential modules only.
- Removed the legacy HTTP, pipeline, validation, LLM, and SDK-oriented surfaces.
- Simplified package metadata and CI to validate the published CLI flow directly.
- Read-only discovery commands no longer create `source.lock` or `.env.maia` side effects.
- `verify` now checks artifact hashes and flags missing materialized files instead of silently accepting incomplete lock state.
- `strictVerify` is opt-in and rejects unresolved source commits when enabled.
- Remote skills now reinstall from the pinned source commit recorded in the lock instead of reusing a mutable branch reference.

### Fixed
- Fixed the empty-list access bug where `deny` was incorrectly treated as wildcard access.
- Fixed false-positive installs for non-existent tools by refusing unknown local registry entries.
- Fixed `ci` flow ordering so reinstall happens before strict verification; the lock is no longer validated against a missing artifact before rehydration.
- Fixed workspace containment checks for `read_file` to prevent escaping the project root via absolute paths and symlinks.
- Fixed MCP protocol negotiation by supporting a version list instead of hardcoding `2024-11-05`, while preserving fallback compatibility with legacy peers.

### Notes
- Several production hardening items remain intentionally open and are tracked as follow-up work: visible secret input in MCP onboarding, inherited `process.env` for stdio/NPX MCPs, and version alignment between package metadata and changelog.

## [1.5.2] - 2026-08-26

### Added
- Bilingual documentation:
  - English README as the primary project landing page.
  - Portuguese README in [README.pt-BR.md](./README.pt-BR.md).

### Changed
- README was rewritten with stronger product positioning, use cases, and onboarding guidance.
- Portuguese documentation was corrected and split into a dedicated localized README.

## [1.5.1] - 2026-08-26

### Added
- Agent bootstrap commands:
  - `maia agent add <name...>`
  - `maia add agent <name...>`
  - `maia add <name...>`
- Agent-aware project bootstrap with `maia init [agent...]`.
- Multi-agent configuration support in a single command (for example `claude`, `copilot`, `zed`, `cursor`, `cline`, and `continue` together).
- Agent aliases:
  - `vscode` / `code` -> `copilot`
  - `cursor-ide` -> `cursor`
  - `continue-dev` -> `continue`

### Changed
- `maia init` now creates the project capability folders:
  - `skills/`
  - `mcps/`
  - `tools/`
- Automatic agent configuration now prioritizes the agent/editor's own config files instead of relying on project-local VS Code compatibility files for bootstrap.

## [1.5.0] - 2026-08-26

### Added
- Built-in Maia MCP server for exposing installed capabilities to external agent clients through a single stdio MCP endpoint.
- New `maia mcp-server` command.

## [1.4.9]

### Added
- Support for `github-skills` as an additional skills discovery provider (GitHub Code Search).
- MCP credential onboarding:
  - `maia mcp find` highlights required credential variables.
  - `maia mcp find` shows where to get credentials when metadata is available.
  - MCP install flow creates/updates project `.env` with required credential keys.

### Changed
- Skills install robustness:
  - canonical skill identifiers are used for installation (display names no longer break install).
  - `maia skills add <query>` falls back to next catalog entries when a result is stale/unavailable.
  - interactive `maia skills find` allows reselection when chosen result is unavailable at source.
- Remote skill resolution now includes fuzzy repository folder matching when catalog slug differs from repository folder name.

## [1.4.8] - 2026-08-26

### Fixed
- Skills installation failures when catalog display name differed from canonical skill slug.
- Skills installation failures caused by stale catalog entries that no longer resolve in source repositories.

## [1.4.7] - 2026-08-26

### Added
- Improved MCP discovery UX with credential hints (`Requer chave/token` and `Onde obter`).
- Automatic `.env` bootstrap/update for MCP credentials during install.

## [1.4.6] - 2026-08-25

### Changed
- Initial CLI catalog workflow stabilization for skills, tools, and MCP resources.
