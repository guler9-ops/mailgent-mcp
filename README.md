# Mailgent MCP-Server

Gibt KI-Agenten in **Claude Code / Claude Desktop, Cursor, Codex** und jedem
anderen MCP-fähigen Client **echte E-Mail-Postfächer** — anlegen, senden,
empfangen, Threads, Webhooks. EU-gehostet, DSGVO-konform.

## Tools
| Tool | Zweck |
|------|-------|
| `create_inbox` | Neues Postfach für einen Agenten anlegen |
| `list_inboxes` | Alle Postfächer auflisten |
| `list_messages` | Nachrichten eines Postfachs (neueste zuerst) |
| `get_message` | Eine Nachricht mit vollem Inhalt holen |
| `send_message` | E-Mail senden (mit `in_reply_to` im Thread antworten) |
| `list_domains` | Eigene Sende-Domains + Status |
| `create_webhook` | Webhook für eingehende Mail/Ereignisse registrieren |
| `list_plans` | Tarife & Limits |

## Voraussetzung
Ein Mailgent-API-Key (`aam_…`) — bekommst du auf **https://mailgent.eu**.

## Einrichtung

### Claude Desktop / Cursor (`mcp.json` bzw. `claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "mailgent": {
      "command": "node",
      "args": ["/ABSOLUTER/PFAD/zu/mcp/index.js"],
      "env": { "MAILGENT_API_KEY": "aam_DEIN_KEY" }
    }
  }
}
```

### Claude Code (CLI)
```bash
claude mcp add mailgent -e MAILGENT_API_KEY=aam_DEIN_KEY -- node /ABSOLUTER/PFAD/zu/mcp/index.js
```

Nach dem Veröffentlichen auf npm genügt statt des Pfads:
`"command": "npx", "args": ["-y", "mailgent-mcp"]`.

## Optional
- `MAILGENT_BASE_URL` — eigene API-Basis-URL (Standard `https://api.inbox.alldesk-ki.com`).

## Installation (lokal, vor npm-Veröffentlichung)
```bash
cd mcp && npm install
```
