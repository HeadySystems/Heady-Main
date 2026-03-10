/**
 * HeadyAutoContext — Barrel Export
 * Mandatory context assembly engine for the Heady platform.
 */
export {
  HeadyAutoContext,
  ContextEnvelope,
  ContextSource,
  CONTEXT_SOURCES,
  CONTEXT_WEIGHTS,
  CSL,
} from './context-assembler.js';

export {
  contextInjector,
  ContextInjectorMiddleware,
  INJECTION_MODES,
  QUALITY_GATES,
} from './context-injector.js';
