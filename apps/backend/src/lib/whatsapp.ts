import { logger } from './logger.js';

/**
 * WhatsApp channel — provider-agnostic interface (§ Automations). WhatsApp-first is core to
 * the Pixel Academy audience, so the seam is wired end-to-end now; swapping in a real BSP
 * (Gupshup / WATI / Meta Cloud API) is config-only — implement `WhatsAppProvider` and select
 * it via WHATSAPP_PROVIDER. The default `stub` logs the send so the whole flow is observable
 * in dev without a key.
 */

export interface WhatsAppMessage {
  to: string; // E.164, e.g. +9198xxxxxxx
  body: string;
  template?: string; // BSP-approved template name, if templated
}

export interface WhatsAppProvider {
  send(msg: WhatsAppMessage): Promise<{ id: string; provider: string }>;
}

class StubWhatsAppProvider implements WhatsAppProvider {
  async send(msg: WhatsAppMessage) {
    logger.info({ to: msg.to, template: msg.template, body: msg.body }, '[whatsapp:stub] would send');
    return { id: `stub-${Date.now()}`, provider: 'stub' };
  }
}

let provider: WhatsAppProvider = new StubWhatsAppProvider();

/** Override the active provider (used by a real BSP adapter at boot, or by tests). */
export function setWhatsAppProvider(p: WhatsAppProvider) {
  provider = p;
}

export async function sendWhatsApp(msg: WhatsAppMessage) {
  return provider.send(msg);
}
