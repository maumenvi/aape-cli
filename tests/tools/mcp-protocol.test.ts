import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { JsonRpcMcpClient } from '../../src/agent/mcp/runtime/client/json-rpc-client.ts';
import type { McpRequestOptions, McpTransport } from '../../src/agent/mcp/runtime/contracts/types.ts';

class InitializeTransport implements McpTransport {
  readonly notifications: string[] = [];
  private readonly initializeResult: unknown;

  constructor(initializeResult: unknown) {
    this.initializeResult = initializeResult;
  }

  async request<TResult = unknown>(
    method: string,
    _params?: unknown,
    _options?: McpRequestOptions,
  ): Promise<TResult> {
    assert.equal(method, 'initialize');
    return this.initializeResult as TResult;
  }

  async notify(method: string): Promise<void> {
    this.notifications.push(method);
  }

  async close(): Promise<void> {}

  isOpen(): boolean {
    return true;
  }
}

describe('legacy MCP protocol negotiation', () => {
  it('preserves a supported server-selected protocol version', async () => {
    const transport = new InitializeTransport({
      protocolVersion: '2024-11-05',
      serverInfo: { name: 'legacy', version: '1.0.0' },
    });
    const client = new JsonRpcMcpClient(transport);

    const result = await client.initialize();

    assert.equal(result.protocolVersion, '2024-11-05');
    assert.deepEqual(transport.notifications, ['notifications/initialized']);
  });

  it('rejects the modern protocol era without masking it or sending initialized', async () => {
    const transport = new InitializeTransport({
      protocolVersion: '2026-07-28',
      serverInfo: { name: 'modern', version: '2.0.0' },
    });
    const client = new JsonRpcMcpClient(transport);

    await assert.rejects(
      () => client.initialize(),
      /Unsupported MCP protocol version "2026-07-28".*stateless 2026-07-28 era is not yet supported/,
    );
    assert.deepEqual(transport.notifications, []);
  });

  it('rejects an initialize response that omits protocolVersion', async () => {
    const transport = new InitializeTransport({ serverInfo: { name: 'invalid', version: '1.0.0' } });
    const client = new JsonRpcMcpClient(transport);

    await assert.rejects(() => client.initialize(), /omitted protocol version/);
    assert.deepEqual(transport.notifications, []);
  });
});
