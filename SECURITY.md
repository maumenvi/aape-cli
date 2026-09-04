# Security and trust policy

Maia installs capability metadata and can execute MCP packages with the permissions of the operating-system user running the CLI. Treat every remote source, registry result, skill, tool, and executable package as untrusted until it has been reviewed for the intended workspace.

## Meaning of `trusted`

The `trusted` source flag is an explicit provenance decision recorded in `maia.lock.json`. It is not a sandbox, signature, malware scan, or guarantee that a package is safe. Remote sources default to `trusted: false`; Maia's bundled local registry is trusted because it is shipped with the installed CLI.

Set `--trusted true` only after reviewing the source owner, repository URL, selected ref, executable commands, install scripts, dependency graph, requested credentials, network destinations, and filesystem access. Prefer immutable commit references over moving branches or tags.

## Lock and integrity guarantees

`maia.lock.json` binds package metadata to its source URL, ref, trust decision, resolved commit, and materialized artifact hash when one is available. `maia verify` detects metadata drift, missing files, and changed artifacts. `maia ci` first validates lock metadata and every existing artifact, restores only after that preflight succeeds, and then performs strict verification again.

These checks provide reproducibility and tamper evidence. They do not establish that the original source or package was benign.

## Executable MCP packages

Stdio and NPX MCP entries execute local commands. Maia limits inherited environment variables and passes declared MCP credentials explicitly, but the child process still has the filesystem and network permissions of the current user unless the operating system or CI runner adds stronger isolation.

For executable packages:

- pin package versions and source commits;
- inspect commands, arguments, lifecycle scripts, and transitive dependencies;
- run CI installations in an isolated, least-privilege environment;
- provide narrowly scoped credentials only through declared placeholders;
- restrict `allowedLlms` and disable unused capabilities;
- review lockfile changes before merging them.

Registry descriptions and credential hints are discovery metadata, not security attestations. A registry entry must receive the same review as a direct remote source.

## Reporting

Do not include secrets, tokens, or private source contents in a public report. Use the repository's private security-reporting channel when available; otherwise contact the maintainers before disclosing exploitable details.
