import { describe, expect, it } from 'vitest';
import { Ledger } from '../../src/core/Ledger.js';
describe('telemetry audit', () => { it('retains events in append order', async () => { const ledger = new Ledger(); await ledger.append({ eventId: '1', correlationId: 'c', sequenceNumber: 1, timestamp: 1, eventType: 'TASK_STARTED', actor: 'SYSTEM_REPLAY', payload: {} }); expect(ledger.events).toHaveLength(1); expect(ledger.events[0].sequenceNumber).toBe(1); }); });
