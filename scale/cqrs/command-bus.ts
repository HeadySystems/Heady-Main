/**
 * CQRS Command Bus — Strict Typed Command Routing
 * Author: Eric Haywood / HeadySystems Inc. — 51 Provisional Patents
 */

export const PHI = 1.618033988749895;
export const PSI = 1 / PHI;
export const CSL_THRESHOLD = 0.618;
export const PHI_SQUARED = PHI * PHI;
export const PHI_CUBED = PHI * PHI * PHI;
export const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987] as const;


import crypto from 'crypto';

export interface Command {
  readonly commandId: string;
  readonly type: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly metadata: CommandMetadata;
}

export interface CommandMetadata {
  readonly userId: string;
  readonly tenantId: string;
  readonly correlationId: string;
  readonly timestamp: string;
  readonly version: number;
}

export interface CommandResult {
  readonly commandId: string;
  readonly success: boolean;
  readonly data?: unknown;
  readonly error?: string;
  readonly executionTimeMs: number;
}

export type CommandHandler = (command: Command) => Promise<CommandResult>;

export class CommandBus {
  private readonly handlers: Map<string, CommandHandler> = new Map();
  private readonly auditLog: Array<{ command: Command; result: CommandResult }> = [];

  register(commandType: string, handler: CommandHandler): void {
    this.handlers.set(commandType, handler);
  }

  async dispatch(command: Command): Promise<CommandResult> {
    const handler = this.handlers.get(command.type);
    if (!handler) {
      return {
        commandId: command.commandId,
        success: false,
        error: `no_handler_for: ${command.type}`,
        executionTimeMs: 0
      };
    }

    const start = Date.now();
    try {
      const result = await handler(command);
      const finalResult = { ...result, executionTimeMs: Date.now() - start };
      this.auditLog.push({ command, result: finalResult });
      return finalResult;
    } catch (err) {
      const result: CommandResult = {
        commandId: command.commandId,
        success: false,
        error: err instanceof Error ? err.message : 'unknown_error',
        executionTimeMs: Date.now() - start
      };
      this.auditLog.push({ command, result });
      return result;
    }
  }

  createCommand(type: string, payload: Record<string, unknown>, userId: string, tenantId: string): Command {
    return {
      commandId: crypto.randomUUID(),
      type,
      payload,
      metadata: {
        userId,
        tenantId,
        correlationId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        version: 1
      }
    };
  }

  getAuditLog(): ReadonlyArray<{ command: Command; result: CommandResult }> {
    return [...this.auditLog];
  }
}
