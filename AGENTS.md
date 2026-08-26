
<!-- aape-capability-discovery -->
## Aape capability discovery

Use the Aape CLI as the authoritative source of truth for skills, tools, and MCP servers.

Before assuming a capability exists, query it with:

```bash
 aape list-capabilities --json
 aape list-tools --json
 aape list-skills --json
```

The project may register capabilities in the manifest while the active agent runtime only exposes a subset. Always prefer the CLI inventory for discovery.

The built-in MCP server should also expose these discovery tools with clear descriptions so downstream agents can call them automatically without repeated prompting.

