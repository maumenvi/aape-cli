/**
 * Encodes a JSON-RPC payload as a newline-delimited UTF-8 frame for stdio MCP transports.
 *
 * @param payload - The JSON-serializable message to encode.
 * @returns A buffer containing the serialized message followed by a newline.
 */
export function encodeMcpMessage(payload: unknown): Buffer {
  const json = JSON.stringify(payload);
  return Buffer.from(`${json}\n`, 'utf8');
}
