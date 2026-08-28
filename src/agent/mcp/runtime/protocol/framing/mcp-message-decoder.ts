import { isJsonRpcMessage } from '../validation/is-json-rpc-message.ts';

/**
 * Incremental decoder for newline-delimited JSON-RPC frames from a stdio MCP server.
 *
 * The decoder buffers partial chunks, splits on newlines, and defensively drops
 * any line that is not valid JSON or not a well-formed JSON-RPC 2.0 envelope,
 * so malformed server output can never be dereferenced downstream.
 */
export class McpMessageDecoder {
  private buffer = '';

  /**
   * Appends a chunk and returns every complete, structurally valid JSON-RPC message decoded so far.
   *
   * @param chunk - Raw bytes received from the server's stdout stream.
   * @returns The list of validated JSON-RPC messages contained in the chunk.
   */
  push(chunk: Buffer): unknown[] {
    this.buffer += chunk.toString('utf8');
    const messages: unknown[] = [];

    let lineEnd = this.buffer.indexOf('\n');
    while (lineEnd !== -1) {
      const line = this.buffer.substring(0, lineEnd).trim();
      if (line.length > 0) {
        const payload = this.decodeLine(line);
        if (typeof payload !== 'undefined') {
          messages.push(payload);
        }
      }
      this.buffer = this.buffer.substring(lineEnd + 1);
      lineEnd = this.buffer.indexOf('\n');
    }

    return messages;
  }

  /**
   * Parses and structurally validates a single JSON-RPC line.
   *
   * @param line - A trimmed, non-empty line from the input buffer.
   * @returns The validated message, or `undefined` when the line is malformed.
   */
  private decodeLine(line: string): unknown {
    let payload: unknown;
    try {
      payload = JSON.parse(line);
    } catch (err) {
      console.error('Failed to parse MCP message:', line, err);
      return undefined;
    }
    if (!isJsonRpcMessage(payload)) {
      console.error('Discarded malformed JSON-RPC message:', line);
      return undefined;
    }
    return payload;
  }
}
