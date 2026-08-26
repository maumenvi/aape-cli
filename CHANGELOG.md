# Changelog (Aape CLI)

All notable changes to the Aape CLI are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.9]

### Added
- Support for `github-skills` as an additional skills discovery provider (GitHub Code Search).
- MCP credential onboarding:
  - `aape mcp find` highlights required credential variables.
  - `aape mcp find` shows where to get credentials when metadata is available.
  - MCP install flow creates/updates project `.env` with required credential keys.

### Changed
- Skills install robustness:
  - canonical skill identifiers are used for installation (display names no longer break install).
  - `aape skills add <query>` falls back to next catalog entries when a result is stale/unavailable.
  - interactive `aape skills find` allows reselection when chosen result is unavailable at source.
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
