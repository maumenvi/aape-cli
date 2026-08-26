#!/usr/bin/env node
let buffer = '';
let callCount = 0;

const write = (payload) => {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
};

const onMessage = (message) => {
  if (message.method === 'initialize') {
    write({
      jsonrpc: '2.0',
      id: message.id,
      result: {
        protocolVersion: '2024-11-05',
        serverInfo: { name: 'mock-flaky', version: '1.0.0' },
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
        tools: [{ name: 'echo', inputSchema: { type: 'object' } }],
      },
    });
    return;
  }

  if (message.method === 'tools/call') {
    callCount += 1;
    if (callCount === 1) {
      write({
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: -32000,
          message: 'Transient tool failure',
        },
      });
      return;
    }
    write({
      jsonrpc: '2.0',
      id: message.id,
      result: {
        content: [{ type: 'text', text: 'recovered' }],
      },
    });
    return;
  }

  if (message.method === 'shutdown') {
    write({ jsonrpc: '2.0', id: message.id, result: {} });
    return;
  }

  if (message.method === 'notifications/initialized' || message.method === 'exit') {
    if (message.method === 'exit') process.exit(0);
    return;
  }
};

const parse = () => {
  while (buffer.includes('\n')) {
    const lineEnd = buffer.indexOf('\n');
    const line = buffer.slice(0, lineEnd).trim();
    buffer = buffer.slice(lineEnd + 1);
    if (line) onMessage(JSON.parse(line));
  }
};

process.stdin.on('data', (chunk) => {
  buffer += chunk.toString('utf8');
  parse();
});
