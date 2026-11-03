// Action Shift rules engine. Ported 1:1 from never86 src_lib_actionShift.ts buildActionShift (ranking, titles, boundaries).
const money = (n) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const NUMS = ['orderCount','laborDollars','laborTargetPct','expectedCash','enteredDeposit','payouts','discounts','promotions','voids','lateDeliveryCount','lateDeliverySales','averageDeliveryMinutes','targetDeliveryMinutes'];
function buildActionShift(input) {
  if (!Number.isFinite(input.grossSales) || input.grossSales <= 0) return { ok: false, error: 'grossSales must be greater than zero. Ask the operator for the sales number from the close.' };
  for (const k of NUMS) { const v = input[k]; if (v !== undefined && (!Number.isFinite(v) || v < 0)) return { ok: false, error: `${k} must be a finite, non-negative number.` }; }
  if (input.laborTargetPct !== undefined && input.laborTargetPct > 100) return { ok: false, error: 'laborTargetPct must be between 0 and 100.' };
  const g = input.grossSales, a = [];
  const cashEntered = input.cashEntered ?? (input.enteredDeposit !== undefined);
  if (cashEntered && input.expectedCash !== undefined && input.enteredDeposit !== undefined) {
    const v = Math.abs(input.expectedCash - input.enteredDeposit);
    if (v >= 0.01) a.push({ id:'cash-proof', score:100+v/g, title:'Verify the cash deposit before booking a shortage', owner:'Closing manager',
      evidence:`${money(input.expectedCash)} expected cash vs ${money(input.enteredDeposit)} entered; ${money(v)} unresolved variance.`,
      move:'Match the deposit slip and bank/deposit record to the POS close, then correct the entry or document the exception.',
      boundary:'An entered deposit variance is not proof of theft, loss, or bank receipt.', nightCheck:'Attach the deposit slip or bank/deposit proof and reconcile expected cash to the final entered deposit.', missing:'Deposit slip or matching bank/deposit record.' });
  }
  if (input.laborDollars !== undefined && input.laborTargetPct !== undefined) {
    const pct = input.laborDollars / g * 100, ex = Math.max(0, input.laborDollars - g * input.laborTargetPct / 100);
    if (pct > input.laborTargetPct) a.push({ id:'labor-window', score:80+ex/g, title:'Fix the labor window, not the whole schedule', owner:'Kitchen or floor manager',
      evidence:`${money(input.laborDollars)} labor is ${pct.toFixed(1)}% of ${money(g)} sales vs the operator target of ${input.laborTargetPct.toFixed(1)}%; ${money(ex)} sits above that target.`,
      move:'Check the current clock and approved schedule by half-hour; move one concrete start, break, or cut only where demand and coverage support it.',
      boundary:'The amount above target is an observed target variance, not guaranteed savings or unauthorized labor.', nightCheck:'Save the approved schedule and final time clock, including manager edits and reasons.', missing:'Current time clock, approved schedule, wage basis, and manager edits.' });
  }
  if ((input.payouts ?? 0) > 0) a.push({ id:'payout-proof', score:75+input.payouts/g, title:'Prove and code every payout', owner:'Closing manager',
      evidence:`${money(input.payouts)} in POS payouts needs receipt and ledger coding.`, move:'Attach each receipt, name the business purpose, and map it to the correct expense bucket before close.',
      boundary:'A payout is not a leak unless supporting evidence shows it was invalid, duplicated, or miscoded.', nightCheck:'Attach receipts and business-purpose coding for every payout.', missing:'Payout detail, receipts, payee, business purpose, and ledger coding.' });
  if ((input.lateDeliveryCount ?? 0) > 0) {
    const m = input.averageDeliveryMinutes !== undefined ? ` Average delivery time was ${input.averageDeliveryMinutes.toFixed(1)} minutes${input.targetDeliveryMinutes !== undefined ? ` vs the operator target of ${input.targetDeliveryMinutes.toFixed(1)}` : ''}.` : '';
    a.push({ id:'delivery-clock', score:70+(input.lateDeliverySales ?? 0)/g, title:'Coach the delivery bottleneck from the late-ticket list', owner:'Kitchen manager',
      evidence:`${input.lateDeliveryCount} late deliver${input.lateDeliveryCount === 1 ? 'y' : 'ies'}${input.lateDeliverySales !== undefined ? ` covering ${money(input.lateDeliverySales)}` : ''}.${m}`,
      move:'Review the late tickets by promise time, make-line completion, handoff, and driver arrival; choose one controllable bottleneck for tonight.',
      boundary:'Sales tied to late tickets are exposed revenue, not proven lost sales or recoverable cash.', nightCheck:'Save the late-ticket exception list with cause and manager follow-up.', missing:'Order-level promise, make-line completion, ready, handoff, and driver-arrival timestamps.' });
  }
  const ap = Math.max(input.discounts ?? 0, input.promotions ?? 0, input.voids ?? 0);
  if (ap > 0) a.push({ id:'approval-proof', score:60+ap/g, title:'Close the approval trail on discounts, promos, and voids', owner:'Manager on duty',
      evidence:`${money(input.discounts ?? 0)} discounts, ${money(input.promotions ?? 0)} promos, and ${money(input.voids ?? 0)} voids were supplied for review.`,
      move:'Match each exception to the ticket, reason, manager authorization, employee, tender, and timestamp; resolve only unsupported exceptions.',
      boundary:'These categories can overlap. They are not added together, and approved exceptions are not automatically waste or abuse.', nightCheck:'Confirm ticket-level reason and manager authorization for discounts, promos, refunds, and voids.', missing:'Ticket-level exception detail with employee, approver, reason, tender, and timestamp.' });
  if (a.length === 0) a.push({ id:'close-packet', score:1, title:"Build tonight's complete close packet", owner:'Closing manager',
      evidence:`${money(g)} in typed sales was supplied, but no supported exception crossed an operator-defined rule.`,
      move:'Save the final POS close, deposit proof, payout receipts, time clock, invoice packet, and delivery exceptions under the same business date.',
      boundary:'No flag from typed inputs does not prove the shift was clean.', nightCheck:'Save one complete, same-scope close packet before leaving the store.' });
  const top = a.sort((x, y) => y.score - x.score).slice(0, 3);
  const store = (input.store || '').trim() || 'Unspecified store';
  const businessDate = (input.businessDate || '').trim() || 'Unspecified business date';
  const basis = (input.salesBasis || '').trim() || 'sales';
  const f = top[0];
  const plain = {
    'cash-proof': 'The cash you counted and the deposit entered do not match. Check the slip before anyone calls it short.',
    'labor-window': 'Labor ran over your own target. Look for the one half-hour window that drove it, not the whole schedule.',
    'payout-proof': 'Cash left the drawer as a payout. It needs a receipt and a code before close.',
    'delivery-clock': 'Some deliveries ran late. Find the one step in the line that slowed them down.',
    'approval-proof': 'Discounts, promos, or voids were run. Make sure each one has a reason and a manager okay.',
    'close-packet': 'Nothing tripped a rule tonight. That does not mean the shift was clean, so save the full packet.'
  }[f.id];
  const notVerified = [f.boundary, 'Missing here: ' + (f.missing || 'Final POS close for the same store and date').replace(/\.$/, '') + '.', 'Final POS close report for the same store, business date, timezone, and cutoff is not checked here.'];
  const nextMove = { title: f.title, owner: f.owner, steps: [
    `Open the original close and check the store (${store}), date (${businessDate}), basis (${basis}), and the number: ${f.evidence}`,
    `${f.owner}: ${f.move}`,
    `Record the decision and what happened. ${f.nightCheck} Outcome stays "not checked" until you confirm.` ] };
  const ifTime = top.slice(1, 3).map(t => ({ title: t.title, evidence: t.evidence, owner: t.owner }));
  const ownerDesk = `${store} ${businessDate}: ${money(g)} ${basis}${input.orderCount !== undefined ? `, ${input.orderCount} orders` : ''}.`;
  const lines = [`**Owner desk, ${store} ${businessDate}:** ${money(g)} ${basis}${input.orderCount !== undefined ? `, ${input.orderCount} orders` : ''}.`,
    `**Do this first:** ${f.evidence}`, `In plain words: ${plain}`,
    `**Not verified here:** ${notVerified.join(' ')}`,
    `**Next move, before the next shift:** ${f.title}`, ...nextMove.steps.map((s, i) => `${i + 1}. ${s}`)];
  if (ifTime.length) { lines.push('**If time:**'); ifTime.forEach(t => lines.push(`- ${t.title}: ${t.evidence}`)); }
  lines.push('Say "check my numbers" to see the math.');
  return { ok: true, result: {
    store, businessDate, salesBasis: basis, sourceStatus: 'unverified',
    ownerDesk, doThisFirst: { id: f.id, title: f.title, evidence: f.evidence, owner: f.owner }, plainWords: plain,
    notVerifiedHere: notVerified, nextMove, ifTime,
    answer: lines.join('\n'),
    boundary: 'This tool ranks review work. It does not make theft, discipline, contract, bank-reconciliation, or guaranteed-savings claims. Targets are operator-supplied only.' } };
}


// Action Shift Free MCP server (stateless Streamable HTTP, JSON responses). 

const props = { store:{type:'string'}, salesBasis:{type:'string',description:'net, gross, or Subtotal, as labeled on the close'}, businessDate:{type:'string'}, grossSales:{type:'number',description:'Sales for the shift/day from the close (required, > 0)'} };
['orderCount','laborDollars','laborTargetPct','expectedCash','enteredDeposit','payouts','discounts','promotions','voids','lateDeliveryCount','lateDeliverySales','averageDeliveryMinutes','targetDeliveryMinutes'].forEach(k => props[k] = { type:'number' });
props.laborTargetPct.description = "Operator's own labor % target. Never assume one.";
const TOOLS = [{ name:'action_shift_read_close', title:'Action Shift: read last night\'s close',
  description:'Read a restaurant close and return the Owner desk line, one Do this first finding, Not verified here, a 3-step next move, and at most 2 If time items, to fix before the next shift from numbers in a restaurant close (POS export, Z report, pasted text). Pass only numbers that appear in the close. Deterministic; no data stored.',
  inputSchema:{ type:'object', properties:props, required:['grossSales'] }, annotations:{ readOnlyHint:true, openWorldHint:false } }];
function rpc(m) {
  const { id, method, params } = m;
  if (method === 'initialize') return { jsonrpc:'2.0', id, result:{ protocolVersion: params?.protocolVersion || '2025-06-18', capabilities:{ tools:{} }, serverInfo:{ name:'action-shift', version:'1.0.0' }, instructions:'Action Shift by Never86\'d. Read the close, call action_shift_read_close with numbers found, then show the answer field in plain operator words. Never invent numbers.' } };
  if (method === 'tools/list') return { jsonrpc:'2.0', id, result:{ tools: TOOLS } };
  if (method === 'tools/call') {
    if (params?.name !== 'action_shift_read_close') return { jsonrpc:'2.0', id, error:{ code:-32602, message:'Unknown tool' } };
    const out = buildActionShift(params.arguments || {});
    return { jsonrpc:'2.0', id, result:{ content:[{ type:'text', text: JSON.stringify(out, null, 2) }], structuredContent: out, isError: !out.ok } };
  }
  if (method === 'notifications/initialized') return null;
  if (method === 'ping') return { jsonrpc:'2.0', id, result:{} };
  if (id === undefined) return null;
  return { jsonrpc:'2.0', id, error:{ code:-32601, message:'Method not found' } };
}
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, mcp-session-id, mcp-protocol-version, authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method === 'GET') return res.status(405).json({ name:'Action Shift MCP', transport:'POST JSON-RPC to this URL' });
  let body = req.body; if (typeof body === 'string') body = JSON.parse(body);
  const out = Array.isArray(body) ? body.map(rpc).filter(Boolean) : rpc(body);
  if (out === null || (Array.isArray(out) && !out.length)) return res.status(202).end();
  res.status(200).json(out);
};
