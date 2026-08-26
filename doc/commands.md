# Referencia de Comandos (CLI)

## Catalogo

```bash
aape init
aape source add <alias> <repo-url> [--ref <ref>] [--trusted true|false]
aape source ls
```

## Skills

```bash
aape skills find <query>
aape skills add <skill-name|owner/repo@skill>
```

## MCP

```bash
aape mcp find <query>
aape mcp add <name>
aape mcp sync
```

## Instalacao estilo npm

```bash
aape i skill <name> [--version <range>] [--source <alias>] [--llms <id1,id2>] [--all-llms]
aape i mcp <name> [--source <alias>] [--transport <stdio|npx|http|sse|ws>] [...]
aape i tool <name> [--version <range>] [--source <alias>] [--llms <id1,id2>] [--all-llms]
```

## Lock/contexto

```bash
aape lock
aape verify
aape ci
aape context build
aape context show --for dev
aape context show --for llm
```

## Outros

```bash
aape ls [skill|mcp|tool]
aape rm <skill|mcp|tool> <name>
aape version
```
