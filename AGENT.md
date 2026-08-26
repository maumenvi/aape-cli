# AGENT.md

## Overview

This repository contains **Aape CLI** only.

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
```

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
2. Prefer targeted changes over broad refactors.
3. Preserve current command behavior unless the task explicitly changes UX.
4. Avoid adding dependencies unless they are clearly necessary.
5. Validate with the existing `typecheck` and `test` scripts before concluding work.

## Notes for future changes

- If a new module does not support the CLI directly, it probably should not live in this repository.
- When adding agent compatibility, wire it through the existing agent registry and config injection flow.
- When adding runtime features, keep them compatible with the built-in MCP server and local catalog layout.
