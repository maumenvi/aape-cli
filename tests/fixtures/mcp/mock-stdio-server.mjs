#!/usr/bin/env node
let buffer = '';
let initialized = false;

const write = (payload) => {
  const json = JSON.stringify(payload);
  process.stdout.write(`${json}\n`);
};

const onMessage = (message) => {
  if (message.method === 'initialize') {
    initialized = true;
    write({
      jsonrpc: '2.0',
      id: message.id,
      result: {
        protocolVersion: '2024-11-05',
        serverInfo: { name: 'mock-mcp', version: '1.0.0' },
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
        tools: [
          {
            name: 'echo',
            description: 'Echoes the provided argument',
            inputSchema: { type: 'object', properties: { text: { type: 'string' } } },
          },
        ],
      },
    });
    return;
  }

  if (message.method === 'tools/call') {
    const text = message.params?.arguments?.text ?? '';
    write({
      jsonrpc: '2.0',
      id: message.id,
      result: {
        content: [{ type: 'text', text: String(text) }],
      },
    });
    return;
  }

  if (message.method === 'shutdown') {
    write({
      jsonrpc: '2.0',
      id: message.id,
      result: {},
    });
    return;
  }

  if (message.method === 'notifications/initialized' || message.method === 'exit') {
    if (message.method === 'exit') {
      process.exit(0);
    }
    return;
  }

  if (typeof message.id === 'number') {
    write({
      jsonrpc: '2.0',
      id: message.id,
      error: {
        code: -32601,
        message: `Method not found: ${message.method}`,
      },
    });
  }
};

const parse = () => {
  let lineEnd = buffer.indexOf('\n');
  while (lineEnd !== -1) {
    const line = buffer.substring(0, lineEnd).trim();
    if (line.length > 0) {
      try {
        const message = JSON.parse(line);
        onMessage(message);
      } catch (err) {
        console.error('Failed to parse MCP message:', line);
      }
    }
    buffer = buffer.substring(lineEnd + 1);
    lineEnd = buffer.indexOf('\n');
  }
};

process.stdin.on('data', (chunk) => {
  buffer += chunk.toString('utf8');
  parse();
});

process.stdin.on('end', () => {
  if (!initialized) process.exit(1);
});
