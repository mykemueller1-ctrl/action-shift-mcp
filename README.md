# Action Shift MCP

Action Shift by Never86'd. Free for restaurant owners. Drop last night's close and get the one thing to fix before your next shift, with the math.

Action Shift is the free one-seat tool from Never86'd. It reads the numbers from last night's restaurant close (Z report, POS export, or pasted numbers) and tells you the one thing to check before your next shift.

Every answer has the same shape:
- **Owner desk:** store, date, sales and basis
- **Do this first:** the headline number with its source
- **Not verified here:** what this cannot prove and what is missing
- **Next move, before the next shift:** exactly 3 steps
- **If time:** at most 2 more items

Rules it follows: only numbers you give it, targets come from you, no theft or savings claims, nothing stored.

## Connect in Grok
1. Go to grok.com/connectors
2. Click New Connector
3. Choose Custom
4. Paste the URL: `https://action-shift-mcp.vercel.app/mcp`

## Source
The deployed Vercel functions are in `api/` (`api/mcp.js`, `api/site.js`) with routing in `vercel.json`. `server.json` is the MCP Registry manifest.

## Endpoint
Streamable HTTP, JSON-RPC 2.0, stateless. One tool: `action_shift_read_close`.

## Links
- Privacy: https://action-shift-mcp.vercel.app/privacy
- Terms: https://action-shift-mcp.vercel.app/terms
- Help: myke@never86.app
- Full app: app.never86.app

## License
MIT
