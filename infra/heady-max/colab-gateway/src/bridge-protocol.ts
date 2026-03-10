/**
 * Colab Gateway — WebSocket Bridge Protocol (JSON-RPC 2.0)
 * Author: Eric Haywood / HeadySystems Inc. — 51 Provisional Patents
 */

import crypto from 'crypto';
import { PHI, PSI, FIB, type BridgeMessage, type BridgeResponse } from './types.js';

interface LogEntry {
  level: string; service: string; msg: string; timestamp: string;
  [key: string]: string | number | boolean | undefined;
}

const log = (level: string, msg: string, meta?: Record<string, string | number | boolean>) => {
  const entry: LogEntry = { level, service: 'colab-bridge', msg, timestamp: new Date().toISOString(), ...meta };
  process.stdout.write(JSON.stringify(entry) + '\n');
};

export class BridgeProtocol {
  private readonly heartbeatIntervalMs: number = FIB[6] * 1000; // 8000ms
  private readonly maxReconnectDelayMs: number = FIB[10] * 1000; // 55000ms
  private readonly batchSize: number = FIB[8]; // 21
  private readonly pendingRequests: Map<string, {
    resolve: (value: BridgeResponse) => void;
    reject: (reason: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }> = new Map();

  createMessage(method: string, params: Record<string, unknown>): BridgeMessage {
    return {
      jsonrpc: '2.0',
      id: crypto.randomUUID(),
      method,
      params
    };
  }

  createResponse(id: string, result: unknown): BridgeResponse {
    return { jsonrpc: '2.0', id, result };
  }

  createErrorResponse(id: string, code: number, message: string): BridgeResponse {
    return { jsonrpc: '2.0', id, error: { code, message } };
  }

  async sendRequest(
    method: string,
    params: Record<string, unknown>,
    sendFn: (data: string) => void,
    timeoutMs: number = FIB[8] * 1000
  ): Promise<BridgeResponse> {
    const message = this.createMessage(method, params);

    return new Promise<BridgeResponse>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(message.id);
        reject(new Error(`request_timeout: ${method} after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingRequests.set(message.id, { resolve, reject, timeout });
      sendFn(JSON.stringify(message));
      log('info', 'bridge_request_sent', { method, id: message.id });
    });
  }

  handleResponse(data: string): boolean {
    try {
      const response: BridgeResponse = JSON.parse(data);
      const pending = this.pendingRequests.get(response.id);
      if (!pending) return false;

      clearTimeout(pending.timeout);
      this.pendingRequests.delete(response.id);
      pending.resolve(response);
      return true;
    } catch {
      log('error', 'invalid_bridge_response', { data: data.substring(0, FIB[11]) });
      return false;
    }
  }

  calculateReconnectDelay(attempt: number): number {
    return Math.min(
      PHI * 1000 * Math.pow(PHI, attempt),
      this.maxReconnectDelayMs
    );
  }

  createBatch(messages: ReadonlyArray<BridgeMessage>): ReadonlyArray<ReadonlyArray<BridgeMessage>> {
    const batches: BridgeMessage[][] = [];
    for (let i = 0; i < messages.length; i += this.batchSize) {
      batches.push(messages.slice(i, i + this.batchSize) as BridgeMessage[]);
    }
    return batches;
  }

  getHeartbeatInterval(): number {
    return this.heartbeatIntervalMs;
  }

  getPendingCount(): number {
    return this.pendingRequests.size;
  }
}
