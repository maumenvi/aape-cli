# Aape

[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D26.0.0-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

[English](./README.md) | Português

O Aape é a forma mais rápida de transformar o uso de agentes em um fluxo repetível e pronto para produção.

Em vez de configurar cada cliente manualmente, procurar arquivos de configuração, duplicar integrações e manter setups isolados para Claude, Copilot, Cursor, Zed, Cline e Continue, o Aape oferece uma camada única de controle para descobrir, instalar e expor skills, MCPs e tools dentro do seu projeto.

Com poucos comandos, você pode:

- inicializar uma estrutura pronta para agentes;
- instalar e organizar skills, MCPs e tools;
- expor tudo por meio de um único MCP server;
- conectar um ou vários agentes ao mesmo projeto;
- reduzir a fricção de setup e acelerar a adoção de AI no time.

Se a ideia for ter um hub operacional único para capacidades de agentes, com configuração reproduzível, onboarding mais rápido e integração prática com os principais clientes do mercado, o Aape foi feito para isso.

## Por que usar o Aape?

Porque trabalhar com agentes em projetos reais não deveria significar configurar cada cliente manualmente, duplicar integrações e manter várias fontes de verdade.

O Aape resolve isso ao oferecer:

- um único fluxo para instalar e organizar skills, MCPs e tools;
- um MCP server central para expor as capacidades instaladas;
- configuração automática para diferentes agentes e editores;
- onboarding mais rápido para times inteiros;
- uma base mais previsível, reproduzível e escalável para desenvolvimento com AI.

Na prática, o Aape encurta o caminho entre "quero usar esse agente no meu projeto" e "o agente já está operando com as capacidades certas".

## CLI-only por design

O Aape tem um objetivo único: tornar o setup de capacidades para agentes algo operacional, reproduzível e compartilhável a partir do terminal.

Isso significa que este repositório é centrado em:

- inicialização do projeto com `skills/`, `mcps/` e `tools/`;
- configuração de um ou vários agentes/editores;
- instalação guiada por catálogo com fluxos de lock e verify;
- um MCP server embutido que expõe as capacidades instaladas.

Se uma funcionalidade não apoiar diretamente esse fluxo de CLI, ela não deve estar neste repositório.

## Casos de uso

O Aape é útil em cenários como:

- times que querem padronizar o uso de agentes entre Claude, Copilot, Cursor e outros clientes;
- projetos que precisam distribuir o mesmo conjunto de skills e MCPs para vários desenvolvedores;
- ambientes em que agentes precisam acessar ferramentas reais do projeto sem configuração manual repetitiva;
- laboratórios e times de produto que querem comparar rapidamente diferentes agentes sobre a mesma base operacional;
- organizações que precisam de um ponto central para governar capacidades, acesso e integrações de AI.

## Comparação: setup manual vs Aape

### Sem Aape

- cada agente precisa ser configurado separadamente;
- os arquivos de MCP ficam espalhados pelo ambiente;
- o onboarding de novos desenvolvedores leva mais tempo;
- a consistência entre ambientes diminui;
- a manutenção de skills, tools e MCPs vira custo operacional.

### Com Aape

- um único fluxo instala e organiza capacidades;
- um único MCP server expõe tudo para os agentes;
- vários agentes podem ser conectados ao mesmo projeto ao mesmo tempo;
- a configuração fica mais previsível e reproduzível;
- o time ganha velocidade para adotar, testar e evoluir workflows com AI.

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
  - [Bootstrap do catálogo](#bootstrap-do-catálogo)
  - [Instalação estilo npm](#instalação-estilo-npm)
  - [Lock e contexto](#lock-e-contexto)
  - [Outros comandos](#outros-comandos)
- [Documentação em `/doc`](#documentação-em-doc)

## Requisitos

- Node.js >= 26

## Instalação

```bash
npm install -g @maumenvi/aape-cli
```

O comando legado `aape` continua funcionando como alias para compatibilidade.

## Uso básico

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

## Getting Started (CLI)

Fluxo rápido:

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

Resultado típico:

- o projeto recebe as pastas de capacidades do Aape;
- um ou vários agentes passam a consumir o mesmo endpoint MCP;
- skills, MCPs e tools instalados ficam mais fáceis de versionar, compartilhar e reproduzir.

Atualizar o CLI local neste repositório:

```bash
aape-update-local /home/marco/Documentos/projetos/aape-cli
```

## Catálogos e credenciais

### Skills

O CLI pode descobrir skills por meio de:

- `provider: "skills.sh"` (`https://skills.sh`)
- `provider: "github-skills"` (`https://api.github.com`)

Comportamento de resiliência:

- usa o identificador canônico para instalar uma skill;
- se uma entrada estiver stale ou indisponível, `aape skills add <query>` tenta automaticamente o próximo resultado;
- em `aape skills find`, você pode selecionar outra opção se a origem escolhida falhar.

### MCP

As entradas de MCP são descobertas a partir do registro configurado (`provider: "mcp"`), por padrão:

- `https://registry.modelcontextprotocol.io`

### Credenciais MCP

Em `aape mcp find`:

- mostra `Requer chave/token: ...`;
- mostra `Onde obter: ...` quando o metadata do registry inclui descrição ou URL.

Em `aape mcp add` (ou instalação por seleção no `find`):

- detecta as variáveis necessárias;
- pede os valores no terminal interativo;
- cria ou atualiza o arquivo `.env` do projeto.

## Referência de comandos

### Bootstrap do catálogo

```bash
aape init [agent...]
aape add <agent...>
aape add agent <agent...>
aape source add <alias> <repo-url> [--ref <ref>] [--trusted true|false]
aape source ls
```

Agentes suportados:

- `claude`
- `copilot`
- `vscode` (alias de `copilot`)
- `code` (alias de `copilot`)
- `cursor`
- `cursor-ide` (alias de `cursor`)
- `zed`
- `cline`
- `continue`
- `continue-dev` (alias de `continue`)

Você pode configurar vários agentes ao mesmo tempo:

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

### Instalação estilo npm

```bash
aape i skill <name> [--version <range>] [--source <alias>] [--llms <id1,id2>] [--all-llms]
aape i mcp <name> [--source <alias>] [--transport <stdio|npx|http|sse|ws>] [...]
aape i tool <name> [--version <range>] [--source <alias>] [--llms <id1,id2>] [--all-llms]
```

### Lock e contexto

```bash
aape lock
aape verify
aape ci
aape context build
aape context show --for dev
aape context show --for llm
```

### Outros comandos

```bash
aape ls [skill|mcp|tool]
aape list-tools [query]
aape rm <skill|mcp|tool> <name>
aape version
```
