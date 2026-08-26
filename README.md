# Aape CLI

[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D26.0.0-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

CLI para catálogo e instalação de skills, MCPs e tools para agentes.

## Índice

- [Requisitos](#requisitos)
- [Instalação](#instalação)
- [Uso básico](#uso-básico)
- [Getting Started (CLI)](#getting-started-cli)
- [Catálogos e credenciais](#catálogos-e-credenciais)
  - [Skills](#skills)
  - [MCP](#mcp)
  - [Credenciais MCP](#credenciais-mcp)
- [Referência de comandos](#referência-de-comandos)
  - [Catálogo](#catálogo)
  - [Instalação estilo npm](#instalação-estilo-npm)
  - [Lock/contexto](#lockcontexto)
  - [Outros](#outros)
- [Documentação em `/doc`](#documentação-em-doc)

## Requisitos

- Node.js >= 26

## Instalação

```bash
npm install -g @maumenvi/aape-cli
```

## Uso básico

```bash
aape init
aape skills find react
aape mcp find filesystem
aape lock
aape verify
```

## Getting Started (CLI)

Fluxo rápido:

```bash
aape init
aape skills find react
aape mcp find filesystem
aape lock
aape verify
```

Atualizar CLI local (repo):

```bash
aape-update-local /home/marco/Documentos/projetos/aape-cli
```

## Catálogos e credenciais

### Skills

O CLI pode buscar skills via:

- `provider: "skills.sh"` (`https://skills.sh`)
- `provider: "github-skills"` (`https://api.github.com`)

Comportamento de resiliência:

- usa identificador canônico para instalar skill;
- se uma entrada estiver stale/indisponível, tenta a próxima automaticamente em `aape skills add <query>`;
- em `aape skills find`, permite selecionar outra opção quando a escolhida falha na origem.

### MCP

MCP é buscado no registry configurado (`provider: "mcp"`), por padrão:

- `https://registry.modelcontextprotocol.io`

### Credenciais MCP

No `aape mcp find`:

- mostra `Requer chave/token: ...`
- mostra `Onde obter: ...` quando o metadata do registry traz descrição/URL

No `aape mcp add` (ou instalação via seleção no find):

- detecta variáveis necessárias;
- pede os valores em terminal interativo;
- cria/atualiza `.env` no diretório do projeto.

## Referência de comandos

### Catálogo

```bash
aape init
aape source add <alias> <repo-url> [--ref <ref>] [--trusted true|false]
aape source ls
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

### Instalação estilo npm

```bash
aape i skill <name> [--version <range>] [--source <alias>] [--llms <id1,id2>] [--all-llms]
aape i mcp <name> [--source <alias>] [--transport <stdio|npx|http|sse|ws>] [...]
aape i tool <name> [--version <range>] [--source <alias>] [--llms <id1,id2>] [--all-llms]
```

### Lock/contexto

```bash
aape lock
aape verify
aape ci
aape context build
aape context show --for dev
aape context show --for llm
```

### Outros

```bash
aape ls [skill|mcp|tool]
aape rm <skill|mcp|tool> <name>
aape version
```

## Documentação em `/doc`

- [Índice da documentação](./doc/README.md)
- [Getting Started](./doc/getting-started.md)
- [Catálogos e Credenciais](./doc/catalogs-and-credentials.md)
- [Referência de Comandos](./doc/commands.md)
