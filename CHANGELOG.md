# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2026-08-25

### Changed
- **MCP Protocol**: Replaced Content-Length framing with newline-delimited messages (spec 2024-11-05)
  - Breaking change: MCP stdio transport now uses newline delimiters instead of Content-Length headers
  - Compatible with official MCP specification
- **Pipeline Termination**: Fixed `stopWhen` to emit single terminal state
  - `run_stopped` now returns immediately without emitting `run_completed`
- **LLM Response**: Added usage metrics (`inputTokens`, `outputTokens`, `totalTokens`)

### Added
- **Budget Integration**: LLM usage automatically tracked with cost estimation per provider
- **Sandbox Policies**: Framework for restricting privileged tools (execute_command, write_file, fetch_url)
  - Default-deny policy: tools now require explicit LLM access policy
- **Automatic ACL Propagation**: LLM identity flows through pipeline without manual `setActiveLlm()`
- **CI Smoke Tests**: Tarball installation and integration tests

### Fixed
- MCP mock server now compliant with newline-delimited protocol
- ACL checks now fallback to pipeline metadata
- Budget tracking for LLM calls now automatic

### Known Issues
- **DevTools**: Requires alignment to new core API types (planned for 1.4.1)

## [1.3.2] - 2026-08-21

### Changed
- Split pipeline internals into focused modules (`constants`, `types`, `options`, `signal`) for smaller and clearer files.
- Reorganized tests into scoped folders: `tests/pipeline`, `tests/http`, and `tests/validation`.
- Added optional pipeline event instrumentation (`run options.devtools`) to support runtime observability without changing default behavior.

### Fixed
- Updated README installation/import examples to use the scoped package name `@maumenvi/aape`.

### Added
- Initial `@maumenvi/aape-devtools` package scaffold with in-memory timeline and SSE stream helper.

## [1.3.1] - 2026-08-21

### Fixed
- Corrected the package versioning for publication to npm.
- Prepared the package for a valid public release after the registry already had version 1.3.0.

## [1.3.0] - 2026-08-21

### Added
- Initial public release of the Aape HTTP framework.
- Core `App` server and HTTP request/response wrappers.
- Router with path matching and parameterized routes.
- Route execution via pipeline graph model.
- Support for sub-routers and global route steps.
- Built-in validation primitives and schema utilities.
- Full project documentation and public README.
- MIT license setup for public distribution.

### Changed
- Refactored router internals into matcher and dispatch modules.
- Kept a clean public API centered on `App`, `Router`, `Pipeline`, and route types.
- Documented architecture and usage examples in `doc/` and project README.

### Fixed
- Resolved the missing route type issue in the trie abstraction.
- Stabilized pipeline execution and added interruption tests to ensure downstream nodes do not run after a failing upstream node.
- Validated the TypeScript and runtime test suite.

## [Unreleased]

### Planned
- Checkpointing support for pipeline execution.
- More advanced plugin/runtime composition.
- Streaming support.
- Parallel node execution patterns and richer orchestration primitives.
