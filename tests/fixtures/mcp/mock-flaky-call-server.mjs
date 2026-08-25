#!/usr/bin/env node
let buffer = Buffer.alloc(0);
let callCount = 0;

const write = (payload) => {
  const body = Buffer.from(JSON.stringify(payload), 'utf8');
  const header = Buffer.from(`Content-Length: ${body.byteLength}\r\n\r\n`, 'utf8');
  process.stdout.write(Buffer.concat([header, body]));
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
  while (true) {
    const headerEnd = buffer.indexOf('\r\n\r\n');
    if (headerEnd < 0) return;
    const header = buffer.subarray(0, headerEnd).toString('utf8');
    const match = header.match(/Content-Length:\s*(\d+)/i);
    if (!match) return;
    const contentLength = Number.parseInt(match[1], 10);
    const bodyStart = headerEnd + 4;
    const bodyEnd = bodyStart + contentLength;
    if (buffer.byteLength < bodyEnd) return;
    const message = JSON.parse(buffer.subarray(bodyStart, bodyEnd).toString('utf8'));
    buffer = buffer.subarray(bodyEnd);
    onMessage(message);
  }
};

process.stdin.on('data', (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);
  parse();
});
