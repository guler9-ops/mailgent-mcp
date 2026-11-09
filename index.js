#!/usr/bin/env node
// Mailgent MCP-Server — stellt die Mailgent-API als MCP-Tools bereit, damit
// KI-Agenten (Claude Code, Cursor, Codex, …) echte E-Mail-Postfächer nutzen
// können: anlegen, auflisten, senden, empfangen, Webhooks. EU-gehostet, DSGVO.
//
// Konfiguration (Umgebungsvariablen):
//   MAILGENT_API_KEY   (Pflicht)  dein Mailgent-API-Key (aam_…)
//   MAILGENT_BASE_URL  (optional) Standard: https://api.inbox.alldesk-ki.com
//
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const BASE = (process.env.MAILGENT_BASE_URL || 'https://api.inbox.alldesk-ki.com').replace(/\/+$/, '');
const KEY = (process.env.MAILGENT_API_KEY || '').trim();
if (!KEY) {
  console.error('Fehler: MAILGENT_API_KEY ist nicht gesetzt. Hol dir deinen Key auf mailgent.eu.');
  process.exit(1);
}

// Dünner REST-Client gegen die Mailgent-API. Fehler werden als lesbarer Text
// zurückgegeben, damit der Agent sinnvoll reagieren kann.
async function api(method, path, body) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: {
        Authorization: `Bearer ${KEY}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new Error(`Mailgent nicht erreichbar: ${e.message}`);
  }
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${json.error || json.detail || text || 'unbekannter Fehler'}`);
  return json;
}

const ok = (data) => ({ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] });
const fail = (e) => ({ isError: true, content: [{ type: 'text', text: 'Fehler: ' + e.message }] });
const wrap = (fn) => async (args) => { try { return ok(await fn(args)); } catch (e) { return fail(e); } };

const server = new McpServer({ name: 'mailgent', version: '1.0.0' });

server.tool(
  'create_inbox',
  'Legt ein neues E-Mail-Postfach für einen Agenten an und gibt dessen Adresse zurück.',
  {
    local_part: z.string().optional().describe('Lokalteil vor dem @ (z. B. "support"). Ohne Angabe wird einer generiert.'),
    display_name: z.string().optional().describe('Anzeigename des Absenders.'),
    domain: z.string().optional().describe('Eigene, bereits verifizierte Domain. Ohne Angabe die geteilte Mailgent-Domain.'),
  },
  wrap((a) => api('POST', '/v1/inboxes', a)),
);

server.tool(
  'list_inboxes',
  'Listet alle Postfächer dieses Accounts (mit Adresse und ID).',
  {},
  wrap(() => api('GET', '/v1/inboxes')),
);

server.tool(
  'list_messages',
  'Listet die Nachrichten eines Postfachs, neueste zuerst (max. 100). Eingehend und ausgehend.',
  { inbox_id: z.string().describe('ID des Postfachs (aus create_inbox/list_inboxes).') },
  wrap(({ inbox_id }) => api('GET', `/v1/inboxes/${encodeURIComponent(inbox_id)}/messages`)),
);

server.tool(
  'get_message',
  'Holt eine einzelne Nachricht inklusive vollem Text/HTML und Metadaten.',
  { message_id: z.string().describe('ID der Nachricht.') },
  wrap(({ message_id }) => api('GET', `/v1/messages/${encodeURIComponent(message_id)}`)),
);

server.tool(
  'send_message',
  'Sendet eine E-Mail aus einem Postfach. Für eine Antwort im Thread "in_reply_to" mit der message_id der Originalnachricht setzen.',
  {
    inbox_id: z.string().describe('ID des sendenden Postfachs.'),
    to: z.union([z.string(), z.array(z.string())]).describe('Empfänger (eine Adresse oder Liste).'),
    subject: z.string().optional().describe('Betreff.'),
    text: z.string().optional().describe('Text-Inhalt.'),
    html: z.string().optional().describe('HTML-Inhalt (optional, zusätzlich oder statt text).'),
    cc: z.union([z.string(), z.array(z.string())]).optional().describe('CC-Empfänger.'),
    in_reply_to: z.string().optional().describe('message_id, auf die geantwortet wird (für Threading).'),
  },
  wrap(({ inbox_id, ...body }) => api('POST', `/v1/inboxes/${encodeURIComponent(inbox_id)}/messages`, body)),
);

server.tool(
  'list_domains',
  'Listet die eigenen Sende-Domains dieses Accounts und ihren Verifizierungsstatus.',
  {},
  wrap(() => api('GET', '/v1/domains')),
);

server.tool(
  'create_webhook',
  'Registriert einen Webhook-Endpunkt, der bei eingehender Mail und Ereignissen aufgerufen wird. Gibt das Signatur-Secret zurück (nur einmal).',
  { url: z.string().url().describe('HTTPS-URL, die die Ereignisse empfängt.') },
  wrap(({ url }) => api('POST', '/v1/webhooks', { url })),
);

server.tool(
  'list_plans',
  'Zeigt die verfügbaren Tarife und Limits (Postfächer, Monatsvolumen).',
  {},
  wrap(() => api('GET', '/v1/billing/plans')),
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`Mailgent MCP-Server läuft (stdio) · API: ${BASE}`);
