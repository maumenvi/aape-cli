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

### Changed
- Reduced the repository to the CLI-essential modules only.
- Removed the legacy HTTP, pipeline, validation, LLM, and SDK-oriented surfaces.
- Simplified package metadata and CI to validate the published CLI flow directly.

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
