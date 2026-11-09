// E2E-Test: startet den Mailgent-MCP-Server und ruft Tools darüber auf.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const KEY = process.env.MAILGENT_API_KEY;
const transport = new StdioClientTransport({
  command: 'node',
  args: ['index.js'],
  env: { ...process.env, MAILGENT_API_KEY: KEY },
});
const client = new Client({ name: 'mcp-e2e-test', version: '1.0.0' });
await client.connect(transport);

const tools = await client.listTools();
console.log('TOOLS:', tools.tools.map((t) => t.name).join(', '));

async function call(name, args = {}) {
  const r = await client.callTool({ name, arguments: args });
  const txt = (r.content?.[0]?.text) || JSON.stringify(r);
  console.log(`\n>>> ${name}(${JSON.stringify(args)})${r.isError ? ' [ERROR]' : ''}\n${txt}`);
  return txt;
}

await call('list_inboxes');
await call('create_inbox', { local_part: 'mcp-test', display_name: 'MCP Test' });
await call('list_inboxes');
await call('list_plans');

await client.close();
console.log('\nE2E OK');
