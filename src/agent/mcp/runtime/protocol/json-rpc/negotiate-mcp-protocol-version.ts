import { isLegacyMcpProtocolVersion } from './is-legacy-mcp-protocol-version.ts';
import { MCP_LEGACY_PROTOCOL_VERSIONS } from './protocol-versions.ts';

/** Negotiates the newest mutually supported revision for a legacy initialize request. */
export function negotiateMcpProtocolVersion(
  requestedVersion?: string,
): (typeof MCP_LEGACY_PROTOCOL_VERSIONS)[number] {
  return isLegacyMcpProtocolVersion(requestedVersion)
    ? requestedVersion
    : MCP_LEGACY_PROTOCOL_VERSIONS[0];
}

