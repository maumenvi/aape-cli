# Especificação: Maia CLI

## 1. Contexto/problema

Projetos que usam agentes de IA precisam descobrir, instalar, versionar e
autorizar skills, MCPs e tools em mais de um cliente. A configuração manual
espalha arquivos, duplica integrações e dificulta reproduzir o mesmo ambiente
entre desenvolvedores.

O Maia deve oferecer um fluxo único, orientado por terminal, para centralizar
essas capacidades em `maia.json` e `.maia/`, manter um catálogo e lockfile verificáveis,
expor as capacidades por MCP e registrar somente o que cada agente está
autorizado a usar.

## 2. User Stories

- Como desenvolvedor, quero inicializar o Maia em um projeto, para obter uma
  estrutura reproduzível para capacidades e agentes.
- Como desenvolvedor, quero escolher um ou mais agentes compatíveis, para
  configurá-los sem editar manualmente seus arquivos nativos.
- Como desenvolvedor, quero descobrir skills, MCPs e tools por consulta, para
  selecionar capacidades disponíveis em catálogos locais ou remotos.
- Como desenvolvedor, quero instalar e remover capacidades, para controlar o
  conjunto efetivamente usado pelo projeto.
- Como mantenedor, quero gerar e verificar um lockfile, para detectar alterações
  ou artefatos ausentes antes de confiar em uma instalação.
- Como operador de CI, quero restaurar uma instalação a partir do lockfile,
  para validar e reproduzir o ambiente sem interação manual.
- Como administrador, quero restringir capacidades por agente ou LLM, para
  evitar que um runtime acesse recursos não autorizados.
- Como usuário de um agente, quero consultar as capacidades pelo MCP, para
  utilizá-las sem configurações duplicadas.
- Como mantenedor do projeto, quero que alterações relevantes tenham testes e
  typecheck verdes, para preservar o comportamento existente.

## 3. Requisitos funcionais

### Inicialização e agentes

- **RF-1** O sistema deve disponibilizar `maia init`, criando ou atualizando o
  manifesto `maia.json` e o lockfile `maia.lock.json` na raiz, e o template
  de ambiente MCP necessário ao projeto. Os diretórios fallback
  `.maia/mcp`, `.maia/skills` e `.maia/tools` devem ser criados somente quando
  alguma capacidade correspondente for materializada.
- **RF-2** O comando de inicialização deve aceitar agentes por argumento e, na
  ausência deles, permitir seleção interativa.
- **RF-3** O sistema deve reconhecer os agentes suportados e seus aliases,
  incluindo Claude, VS Code/Copilot, Cursor, Zed, Cline, Continue e OpenAI
  Codex.
- **RF-4** O sistema deve disponibilizar `maia agent add`, `maia add agent`,
  `maia add` e `maia agent ls` para configurar ou listar agentes.
- **RF-5** A configuração de um agente deve registrar o proxy `maia`, o perfil
  de autorização e as capacidades autorizadas nos locais nativos do agente,
  sem sobrescrever conteúdo fora do bloco gerenciado pelo Maia.
- **RF-5a** Cada agente deve usar seu formato nativo de instruções e capacidades:
  Claude usa `.mcp.json`, `.claude/skills/` e `CLAUDE.md`; Copilot usa
  `.vscode/mcp.json`, `.github/skills/` e `.github/copilot-instructions.md`;
  os demais agentes devem usar seus caminhos nativos registrados.
- **RF-5b** Quando nenhum agente for selecionado, skills, MCPs e tools devem
  permanecer disponíveis nos diretórios fallback dentro de `.maia`.
- **RF-6** Reexecutar a inicialização ou a configuração de agentes deve ser
  idempotente e não deve duplicar entradas.

### Catálogo, descoberta e fontes

- **RF-7** O sistema deve manter inventário local de skills, MCPs e tools e
  permitir listá-lo com `maia ls`, `maia list-skills`, `maia list-tools` e
  `maia list-capabilities`.
- **RF-8** Os comandos de listagem devem aceitar consulta textual e saída JSON
  quando solicitado.
- **RF-9** O sistema deve consultar os provedores configurados para descobrir
  capacidades remotas e usar identificadores canônicos na instalação.
- **RF-10** O sistema deve permitir adicionar e listar fontes Git por meio de
  `maia source add` e `maia source ls`, incluindo referência e estado de
  confiança da fonte.
- **RF-11** Quando um resultado remoto estiver indisponível, a descoberta ou
  instalação deve tentar uma alternativa disponível ou informar claramente que
  nenhum resultado foi encontrado.

### Instalação e remoção

- **RF-12** O sistema deve instalar skills, MCPs e tools com
  `maia install`/`maia i`, aceitando versão, fonte e escopo de LLM como opções.
- **RF-13** O sistema deve permitir selecionar todos os LLMs ou uma lista
  explícita de LLMs autorizados para uma capacidade.
- **RF-14** Skills instaladas devem ser materializadas em `.maia/skills` e,
  quando aplicável, também nos diretórios nativos dos agentes configurados.
- **RF-15** MCPs devem aceitar os transportes e configurações declarados pelo
  catálogo, registrar variáveis de credencial necessárias e sincronizar a
  configuração nativa do agente.
- **RF-16** Ferramentas devem ser instaladas somente a partir do registro local.
- **RF-17** O sistema deve permitir remover uma capacidade com
  `maia rm`/`maia remove` e atualizar o estado derivado da instalação.
- **RF-18** Executar `maia install` sem uma capacidade específica deve restaurar
  as capacidades do lockfile e sincronizar os agentes configurados.

### Lockfile, integridade e contexto

- **RF-19** `maia lock` deve gerar ou atualizar o lockfile com versões, fontes,
  dependências, autorizações e metadados necessários à reprodução.
- **RF-20** `maia verify` deve validar a integridade do lockfile e dos artefatos,
  falhando explicitamente quando houver divergência ou arquivo ausente.
- **RF-21** `maia ci` deve validar os metadados e hashes antes de materializar
  artefatos, restaurar o ambiente a partir do lockfile e executar a
  sincronização dos agentes.
- **RF-22** `maia context build` deve gerar os contextos de desenvolvimento e
  de LLM; `maia context show` deve exibir o contexto solicitado.

### MCP e segurança

- **RF-23** `maia mcp find`, `maia mcp add` e `maia mcp sync` devem permitir
  descobrir, instalar e sincronizar MCPs com o registro do projeto.
- **RF-24** O servidor `maia mcp-server` deve expor as capacidades instaladas
  por stdio e suportar descoberta dinâmica opcional e identificação de agente.
- **RF-25** O protocolo MCP deve validar estruturalmente mensagens JSON-RPC e
  rejeitar revisões incompatíveis de forma explícita.
- **RF-26** Processos de MCP devem herdar somente variáveis de ambiente
  necessárias ao runtime e aquelas declaradas explicitamente pelo MCP.
- **RF-27** Segredos não devem ser exibidos no terminal, versionados no
  repositório ou incluídos em arquivos além das variáveis referenciadas pelos
  MCPs instalados.
- **RF-28** Ações destrutivas e alterações de arquivos devem respeitar
  guardrails de segurança e validações automatizadas; não devem depender
  somente da intenção do modelo.

### Qualidade e evolução

- **RF-29** Toda lógica nova ou alterada deve possuir testes usando `node:test`,
  e o typecheck deve permanecer verde.
- **RF-30** O código de produção deve manter um símbolo nomeado por arquivo,
  pastas por escopo, imports diretos e documentação JSDoc para APIs chamáveis.
- **RF-31** Nomes de arquivos devem separar cada palavra por ponto e arquivos de
  teste devem terminar em `.test.ts`.
- **RF-32** Cada mudança deve ser pequena, reversível e passível de revisão
  humana entre especificação, plano, tarefas e implementação.
- **RF-33** O comportamento de comandos existentes deve ser preservado quando
  uma mudança não o alterar explicitamente.

## 4. Critérios de aceite em EARS

- Quando o usuário executar `maia init` em um projeto não inicializado, o
  sistema deve criar a estrutura Maia e informar que manifesto, lockfile e
  orientações foram inicializados.
- Quando o usuário informar agentes no `init` ou em `agent add`, o sistema deve
  configurar cada agente suportado uma única vez e rejeitar nomes inválidos com
  uma mensagem de uso.
- Quando nenhum agente for selecionado, o sistema deve manter as capacidades nos
  diretórios fallback `.maia/mcp`, `.maia/skills` e `.maia/tools`, sem criar
  configurações nativas de agentes; pastas sem capacidades não devem ser
  criadas.
- Quando um agente for selecionado, o sistema deve criar somente os arquivos
  nativos daquele agente; por exemplo, Claude pode criar `.mcp.json`, enquanto
  Copilot deve criar `.vscode/mcp.json`.
- Quando o usuário executar um comando de listagem com `--json`, o sistema deve
  emitir um payload JSON válido contendo as seções correspondentes ao inventário.
- Quando uma consulta encontrar capacidades, o sistema deve exibir resultados
  selecionáveis ou instalar o melhor resultado conforme o comando utilizado.
- Quando uma consulta não encontrar capacidades, o sistema deve informar que
  nenhum resultado foi encontrado sem simular uma instalação bem-sucedida.
- Quando o usuário instalar uma capacidade válida, o sistema deve atualizar o
  manifesto, o lockfile, os artefatos e os agentes configurados de forma
  consistente.
- Quando o usuário solicitar uma tool com fonte remota, o sistema deve rejeitar
  a operação e informar que tools aceitam somente o registro local.
- Quando o usuário executar `maia verify` sem lockfile, o sistema deve falhar e
  orientar a executar `maia lock`.
- Quando o usuário executar `maia ci`, o sistema deve falhar antes de
  materializar arquivos se os metadados ou hashes do lockfile forem inválidos.
- Quando um MCP exigir credenciais, o sistema deve solicitar os valores sem
  exibi-los e persistir somente as variáveis necessárias.
- Quando um agente for reconfigurado, o sistema deve preservar instruções
  existentes fora dos marcadores gerenciados pelo Maia.
- Quando `maia init` for reexecutado sem novos agentes em um projeto com
  agentes já configurados, o sistema deve recriar as configurações nativas
  ausentes desses agentes.
- Quando o servidor MCP receber JSON-RPC estruturalmente inválido ou revisão
  incompatível, o sistema deve rejeitar a mensagem explicitamente.
- Quando os testes, typecheck ou verificação arquitetural falharem, a mudança
  não deve ser considerada pronta para integração.

## 5. Fora de escopo

- Interface gráfica, aplicativo web ou API HTTP pública.
- Pipeline engine, SDK de uso geral ou execução autônoma de agentes.
- Suporte a versões de Node.js inferiores a 26.
- Armazenamento remoto próprio para catálogos, credenciais ou artefatos.
- Reescrita silenciosa de revisões incompatíveis do protocolo MCP.
- Inclusão de segredos, credenciais reais ou arquivos de ambiente sensíveis no
  controle de versão.
- Alterações nos arquivos nativos de agentes que não sejam necessárias para
  registrar capacidades gerenciadas pelo Maia.

## 6. Questões em aberto

- O formato definitivo de configuração MCP do Cursor e do Cline deve ser
  confirmado antes de considerar essas integrações production-grade.
- O suporte a skills com múltiplos arquivos deve definir se somente `SKILL.md`
  é suficiente ou se o conjunto completo deve ser materializado.
- `maia rm` e `maia mcp sync` devem confirmar se a restauração nativa de todos
  os agentes configurados ocorre sempre após a sincronização.
- O comportamento do binário empacotado deve ser validado em sistemas
  operacionais e shells além do smoke test Linux.
