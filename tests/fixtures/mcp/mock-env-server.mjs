#!/usr/bin/env node
let buffer = '';

const write = (payload) => {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
};

const onMessage = (message) => {
  if (message.method === 'initialize') {
    write({
      jsonrpc: '2.0',
      id: message.id,
      result: {
        protocolVersion: '2025-06-18',
        serverInfo: { name: 'mock-env-mcp', version: '1.0.0' },
        capabilities: {},
      },
    });
    return;
  }

  if (message.method === 'tools/list') {
    write({
      jsonrpc: '2.0',
      id: message.id,
      result: {
        tools: [{
          name: 'read-env',
          description: 'Reads selected environment variables for isolation tests',
          inputSchema: { type: 'object' },
        }],
      },
    });
    return;
  }

  if (message.method === 'tools/call') {
    const names = Array.isArray(message.params?.arguments?.names)
      ? message.params.arguments.names.map(String)
      : [];
    const values = Object.fromEntries(names.map((name) => [name, process.env[name] ?? null]));
    write({
      jsonrpc: '2.0',
      id: message.id,
      result: { content: [{ type: 'text', text: JSON.stringify(values) }] },
    });
    return;
  }

  if (message.method === 'shutdown') {
    write({ jsonrpc: '2.0', id: message.id, result: {} });
    return;
  }

  if (message.method === 'exit') {
    process.exit(0);
  }
};

process.stdin.on('data', (chunk) => {
  buffer += chunk.toString('utf8');
  let lineEnd = buffer.indexOf('\n');
  while (lineEnd !== -1) {
    const line = buffer.slice(0, lineEnd).trim();
    buffer = buffer.slice(lineEnd + 1);
    if (line) onMessage(JSON.parse(line));
    lineEnd = buffer.indexOf('\n');
  }
});
