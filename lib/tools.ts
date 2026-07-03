export interface ToolDef {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
  execute: (args: Record<string, unknown>) => string;
}

const FAKE_ORDERS: Record<string, { status: string; item: string; eta: string }> = {
  '1001': { status: 'shipped', item: 'Wireless Mouse', eta: '2026-07-05' },
  '1002': { status: 'processing', item: 'Mechanical Keyboard', eta: '2026-07-10' },
};

const FAKE_REFUND_POLICIES: Record<string, string> = {
  electronics: 'Electronics can be refunded within 30 days if unopened.',
  clothing: 'Clothing can be refunded within 60 days with tags attached.',
  default: 'Standard refund window is 30 days from delivery.',
};

const createdTickets: { id: string; summary: string; priority: string }[] = [];

export const TOOLS: ToolDef[] = [
  {
    name: 'lookup_order',
    description: "Look up an order's status by its order ID.",
    parameters: {
      type: 'object',
      properties: { order_id: { type: 'string', description: 'The order ID to look up.' } },
      required: ['order_id'],
    },
    execute: (args) => {
      const orderId = String(args.order_id);
      const order = FAKE_ORDERS[orderId];
      if (!order) return JSON.stringify({ error: `No order found with ID ${orderId}` });
      return JSON.stringify({ order_id: orderId, ...order });
    },
  },
  {
    name: 'check_refund_policy',
    description: 'Check the refund policy for a product category.',
    parameters: {
      type: 'object',
      properties: {
        product_category: { type: 'string', description: 'e.g. electronics, clothing' },
      },
      required: ['product_category'],
    },
    execute: (args) => {
      const category = String(args.product_category).toLowerCase();
      return JSON.stringify({ policy: FAKE_REFUND_POLICIES[category] ?? FAKE_REFUND_POLICIES.default });
    },
  },
  {
    name: 'create_ticket',
    description: 'Create a support ticket for an issue that needs human follow-up.',
    parameters: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'Short summary of the issue.' },
        priority: { type: 'string', description: 'One of: low, medium, high.' },
      },
      required: ['summary', 'priority'],
    },
    execute: (args) => {
      const id = `TCK-${createdTickets.length + 1}`;
      createdTickets.push({ id, summary: String(args.summary), priority: String(args.priority) });
      return JSON.stringify({ ticket_id: id, status: 'created' });
    },
  },
];

export function getToolByName(name: string): ToolDef | undefined {
  return TOOLS.find((t) => t.name === name);
}

export function executeTool(name: string, args: Record<string, unknown>): string {
  const tool = getToolByName(name);
  if (!tool) return JSON.stringify({ error: `Unknown tool: ${name}` });
  return tool.execute(args);
}
