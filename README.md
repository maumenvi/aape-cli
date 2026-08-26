# Aape

[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D26.0.0-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

English | [Português](./README.pt-BR.md)

Aape is the fastest way to turn agent tooling into a repeatable, production-ready workflow.

Instead of manually wiring every client, hunting down config files, duplicating integrations, and maintaining isolated setups for Claude, Copilot, Cursor, Zed, Cline, and Continue, Aape gives you a single control layer for discovering, installing, and exposing skills, MCPs, and tools across your project.

**Aape is now a CLI-only project.** This repository is intentionally focused on the command-line workflow for bootstrapping agent-ready projects, managing capability catalogs, and exposing them through a built-in MCP server. It is not a general SDK, HTTP framework, or pipeline engine.

With just a few commands, you can:

- initialize an agent-ready project structure;
- install and organize skills, MCPs, and tools;
- expose everything through one MCP server;
- connect one or many agents to the same project;
- reduce setup friction and accelerate AI adoption for your team.

If you want one operational hub for agent capabilities, reproducible setup, faster onboarding, and practical integration with the leading AI clients on the market, Aape is built for that.

## Why use Aape?

Because working with agents in real projects should not mean manually configuring every client, duplicating integrations, and maintaining multiple sources of truth.

Aape solves that by providing:

- one workflow to install and organize skills, MCPs, and tools;
- one central MCP server to expose installed capabilities;
- automatic setup for different agents and editors;
- faster onboarding for entire teams;
- a more predictable, reproducible, and scalable foundation for AI-powered development.

In practice, Aape shortens the path between "I want this agent in my project" and "the agent is already working with the right capabilities."

## CLI-only by design

Aape has a single goal: make agent capability setup operational, reproducible, and shareable from the terminal.

That means this repository is centered on:

- project initialization with `skills/`, `mcps/`, and `tools/`;
- agent/editor setup for one or many clients;
- catalog-driven installation and lock/verify workflows;
- a built-in MCP server that exposes installed capabilities.

If a feature does not support that CLI workflow directly, it does not belong in this repository.

## Use cases

Aape is useful in scenarios such as:

- teams standardizing agent usage across Claude, Copilot, Cursor, and other clients;
- projects that need to distribute the same set of skills and MCPs to multiple developers;
- environments where agents must access real project tooling without repeated manual setup;
- product teams and labs comparing multiple agents over the same operational stack;
- organizations that need a central point to govern AI capabilities, access, and integrations.

## Comparison: manual setup vs Aape

### Without Aape

- each agent must be configured separately;
- MCP files end up scattered across the environment;
- onboarding new developers takes longer;
- consistency between environments drops;
- maintaining skills, tools, and MCPs becomes operational overhead.

### With Aape

- one workflow installs and organizes capabilities;
- one MCP server exposes everything to agents;
- multiple agents can be connected to the same project at the same time;
- configuration becomes more predictable and reproducible;
- teams move faster when adopting, testing, and evolving AI workflows.

## Table of contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Basic usage](#basic-usage)
- [Getting started (CLI)](#getting-started-cli)
- [Catalogs and credentials](#catalogs-and-credentials)
  - [Skills](#skills)
  - [MCP](#mcp)
  - [MCP credentials](#mcp-credentials)
- [Command reference](#command-reference)
  - [Catalog bootstrap](#catalog-bootstrap)
  - [npm-style installation](#npm-style-installation)
  - [Lock and context](#lock-and-context)
  - [Other commands](#other-commands)
- [Documentation in `/doc`](#documentation-in-doc)

## Requirements

- Node.js >= 26

## Installation

```bash
npm install -g @maumenvi/aape-cli
```

The legacy `aape` command still works as an alias for compatibility.

## Basic usage

```bash
aape init
aape init claude
aape init claude vscode
aape add claude vscode
aape list-tools
aape list-tools react
aape skills find react
aape mcp find filesystem
aape lock
aape verify
```

## Getting started (CLI)

Quick flow:

```bash
aape init
aape init copilot
aape init claude copilot
aape add agent claude copilot
aape list-tools
aape skills find react
aape mcp find filesystem
aape lock
aape verify
```

Typical result:

- your project gets the Aape capability folders;
- one or more agents are configured to consume the same MCP entrypoint;
- installed skills, MCPs, and tools become easier to version, share, and reproduce.

Update the local CLI in this repository:

```bash
aape-update-local /home/marco/Documentos/projetos/aape-cli
```

## Catalogs and credentials

### Skills

The CLI can discover skills through:

- `provider: "skills.sh"` (`https://skills.sh`)
- `provider: "github-skills"` (`https://api.github.com`)

Resilience behavior:

- uses the canonical identifier to install a skill;
- if one entry is stale or unavailable, `aape skills add <query>` automatically tries the next match;
- in `aape skills find`, you can select another result if the chosen source fails.

### MCP

MCP entries are discovered from the configured registry (`provider: "mcp"`), by default:

- `https://registry.modelcontextprotocol.io`

### MCP credentials

In `aape mcp find`:

- shows `Requer chave/token: ...`;
- shows `Onde obter: ...` when the registry metadata includes a description or URL.

In `aape mcp add` (or installation through selection in `find`):

- detects required variables;
- prompts for values in the interactive terminal;
- creates or updates the project's `.env.aape` file without overwriting the real project `.env`.

## Command reference

### Catalog bootstrap

```bash
aape init [agent...]
aape add <agent...>
aape add agent <agent...>
aape source add <alias> <repo-url> [--ref <ref>] [--trusted true|false]
aape source ls
```

Supported agents:

- `claude`
- `copilot`
- `vscode` (alias for `copilot`)
- `code` (alias for `copilot`)
- `cursor`
- `cursor-ide` (alias for `cursor`)
- `zed`
- `cline`
- `continue`
- `continue-dev` (alias for `continue`)

You can configure multiple agents at the same time:

```bash
aape init claude vscode
aape add claude copilot
aape add agent claude cursor zed
```

### Skills

```bash
aape skills find <query>
aape skills add <skill-name|owner/repo@skill>
```

### MCP

```bash
aape mcp find <query>
aape mcp add <name>
aape mcp sync
```

### npm-style installation

```bash
aape i skill <name> [--version <range>] [--source <alias>] [--llms <id1,id2>] [--all-llms]
aape i mcp <name> [--source <alias>] [--transport <stdio|npx|http|sse|ws>] [...]
aape i tool <name> [--version <range>] [--source <alias>] [--llms <id1,id2>] [--all-llms]
```

### Lock and context

```bash
aape lock
aape verify
aape ci
aape context build
aape context show --for dev
aape context show --for llm
```

### Other commands

```bash
aape ls [skill|mcp|tool]
aape list-tools [query]
aape rm <skill|mcp|tool> <name>
aape version
```
