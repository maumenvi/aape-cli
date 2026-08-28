# AGENT.md

## Overview

This repository contains **Maia CLI** only.

The project is focused on:
- bootstrapping `skills/`, `mcps/`, and `tools/`
- installing and tracking agent capabilities through the local catalog
- exposing installed capabilities through the built-in MCP server
- configuring one or more compatible agents/editors such as Claude and VS Code/Copilot

There is no HTTP framework, pipeline engine, or general-purpose SDK surface in this repository anymore.

## Stack and runtime

- Node.js >= 26
- TypeScript with ESM
- CLI entrypoint: `src/cli/index.ts`

## Main commands

```bash
node src/cli/index.ts help
node src/cli/index.ts init
node src/cli/index.ts init claude vscode
node src/cli/index.ts add agent claude cursor
node src/cli/index.ts mcp-server
node src/cli/index.ts list-capabilities --json
node src/cli/index.ts list-tools --json
node src/cli/index.ts list-skills --json
```

## Capability discovery protocol

When an agent needs to know which skills, tools, or MCP servers are available in the workspace, it must not guess from the runtime or from local project files alone.

The canonical discovery path is the CLI:

```bash
maia list-capabilities --json
# or
 maia list-tools --json
 maia list-skills --json
```

Use `list-capabilities` as the primary command for inventory and discovery. It returns the installed entries, local registry, and catalog matches in one machine-readable payload.

This matters because the project may register capabilities in the manifest while the active agent runtime only exposes a subset of them. The list commands are the authoritative source for the currently available Maia inventory.

For external agents and editors, the built-in MCP server should also expose the same discovery flow via tool descriptions so the agent can call it automatically without repeated prompting.

## Project structure

```text
src/
  cli/
    commands/
    install/
    shared/
  agent/
    access/
    agents/
    catalog/
    mcp/
    tools/
  config/
data/
tests/
```

## Development rules

1. Keep the repository CLI-focused.
2. Keep each named top-level function, function-valued constant, class, interface, type alias, or enum in its own scoped file under `src/`.
3. Import declarations directly from their owner files; do not add barrels, re-exports, or empty subclass compatibility shims.
4. Group imports as Node built-ins, external packages, and project-relative modules, sorting each group alphabetically.
5. Add JSDoc to functions, classes, and class/interface methods.
6. Preserve current command behavior unless the task explicitly changes UX.
7. Avoid adding dependencies unless they are clearly necessary.
8. Validate with `typecheck`, `check:architecture`, and the test/coverage scripts before concluding work.

## Notes for future changes

- If a new module does not support the CLI directly, it probably should not live in this repository.
- When adding agent compatibility, wire it through the existing agent registry and config injection flow.
- When adding runtime features, keep them compatible with the built-in MCP server and local catalog layout.


<!-- maia-capability-discovery -->
## Maia capability discovery

Use the Maia CLI as the authoritative source of truth for skills, tools, and MCP servers.

Before assuming a capability exists, query it with:

```bash
 maia list-capabilities --json
 maia list-tools --json
 maia list-skills --json
```

The project may register capabilities in the manifest while the active agent runtime only exposes a subset. Always prefer the CLI inventory for discovery.

The built-in MCP server should also expose these discovery tools with clear descriptions so downstream agents can call them automatically without repeated prompting.
## Maia capability discovery

Use the Maia CLI as the authoritative source of truth for skills, tools, and MCP servers.

Before assuming a capability exists, query it with:

```bash
 maia list-capabilities --json
 maia list-tools --json
 maia list-skills --json
```

The project may register capabilities in the manifest while the active agent runtime only exposes a subset. Always prefer the CLI inventory for discovery.

The built-in MCP server should also expose these discovery tools with clear descriptions so downstream agents can call them automatically without repeated prompting.
