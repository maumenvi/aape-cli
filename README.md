# Maia

[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D26.0.0-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

English | [Português](./README.pt-BR.md)

Maia is the fastest way to turn agent tooling into a repeatable, production-ready workflow.

Instead of manually wiring every client, hunting down config files, duplicating integrations, and maintaining isolated setups for Claude, Copilot, Cursor, Zed, Cline, and Continue, Maia gives you a single control layer for discovering, installing, and exposing skills, MCPs, and tools across your project.

**Maia is now a CLI-only project.** This repository is intentionally focused on the command-line workflow for bootstrapping agent-ready projects, managing capability catalogs, and exposing them through a built-in MCP server. It is not a general SDK, HTTP framework, or pipeline engine.

With just a few commands, you can:

- initialize an agent-ready project structure;
- install and organize skills, MCPs, and tools;
- expose everything through one MCP server;
- connect one or many agents to the same project;
- reduce setup friction and accelerate AI adoption for your team.

If you want one operational hub for agent capabilities, reproducible setup, faster onboarding, and practical integration with the leading AI clients on the market, Maia is built for that.

## Why use Maia?

Because working with agents in real projects should not mean manually configuring every client, duplicating integrations, and maintaining multiple sources of truth.

Maia solves that by providing:

- one workflow to install and organize skills, MCPs, and tools;
- one central MCP server to expose installed capabilities;
- automatic setup for different agents and editors;
- faster onboarding for entire teams;
- a more predictable, reproducible, and scalable foundation for AI-powered development.

In practice, Maia shortens the path between "I want this agent in my project" and "the agent is already working with the right capabilities."

## CLI-only by design

Maia has a single goal: make agent capability setup operational, reproducible, and shareable from the terminal.

That means this repository is centered on:

- project initialization with `skills/`, `mcps/`, and `tools/`;
- agent/editor setup for one or many clients;
- catalog-driven installation and lock/verify workflows;
- a built-in MCP server that exposes installed capabilities.

If a feature does not support that CLI workflow directly, it does not belong in this repository.

## Use cases

Maia is useful in scenarios such as:

- teams standardizing agent usage across Claude, Copilot, Cursor, and other clients;
- projects that need to distribute the same set of skills and MCPs to multiple developers;
- environments where agents must access real project tooling without repeated manual setup;
- product teams and labs comparing multiple agents over the same operational stack;
- organizations that need a central point to govern AI capabilities, access, and integrations.

## Comparison: manual setup vs Maia

### Without Maia

- each agent must be configured separately;
- MCP files end up scattered across the environment;
- onboarding new developers takes longer;
- consistency between environments drops;
- maintaining skills, tools, and MCPs becomes operational overhead.

### With Maia

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
npm install -g @maumenvi/maia-cli
```

The CLI command is `maia`.

## Basic usage

```bash
maia init
maia init claude
maia init claude vscode
maia add claude vscode
maia list-tools
maia list-tools react
maia skills find react
maia mcp find filesystem
maia lock
maia verify
```

## Getting started (CLI)

Quick flow:

```bash
maia init
maia init copilot
maia init claude copilot
maia add agent claude copilot
maia list-tools
maia skills find react
maia mcp find filesystem
maia lock
maia verify
```

Typical result:

- your project gets the Maia capability folders;
- one or more agents are configured to consume the same MCP entrypoint;
- installed skills, MCPs, and tools become easier to version, share, and reproduce.

Update the local CLI in this repository:

```bash
maia-update-local /home/marco/Documentos/projetos/maia-cli
```

## Catalogs and credentials

### Skills

The CLI can discover skills through:

- `provider: "skills.sh"` (`https://skills.sh`)
- `provider: "github-skills"` (`https://api.github.com`)

Resilience behavior:

- uses the canonical identifier to install a skill;
- if one entry is stale or unavailable, `maia skills add <query>` automatically tries the next match;
- in `maia skills find`, you can select another result if the chosen source fails.

### MCP

MCP entries are discovered from the configured registry (`provider: "mcp"`), by default:

- `https://registry.modelcontextprotocol.io`

### MCP credentials

In `maia mcp find`:

- shows `Requer chave/token: ...`;
- shows `Onde obter: ...` when the registry metadata includes a description or URL.

In `maia mcp add` (or installation through selection in `find`):

- detects required variables;
- prompts for values in the interactive terminal;
- creates or updates the project's `.env.maia` file with only the variables referenced by installed MCP configs;
- preserves custom entries and removes obsolete auto-generated defaults from older templates;
- rebuilds those MCP variables during `maia install` and `maia ci` from `source.lock`, without overwriting the real project `.env`.

## Command reference

### Catalog bootstrap

```bash
maia init [agent...]
maia add <agent...>
maia add agent <agent...>
maia source add <alias> <repo-url> [--ref <ref>] [--trusted true|false]
maia source ls
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
maia init claude vscode
maia add claude copilot
maia add agent claude cursor zed
```

### Skills

```bash
maia skills find <query>
maia skills add <skill-name|owner/repo@skill>
```

### MCP

```bash
maia mcp find <query>
maia mcp add <name>
maia mcp sync
```

### npm-style installation

```bash
maia i skill <name> [--version <range>] [--source <alias>] [--llms <id1,id2>] [--all-llms]
maia i mcp <name> [--source <alias>] [--transport <stdio|npx|http|sse|ws>] [...]
maia i tool <name> [--version <range>] [--source <alias>] [--llms <id1,id2>] [--all-llms]
```

### Lock and context

```bash
maia lock
maia verify
maia ci
maia context build
maia context show --for dev
maia context show --for llm
```

### Other commands

```bash
maia ls [skill|mcp|tool]
maia list-tools [query]
maia rm <skill|mcp|tool> <name>
maia version
```
