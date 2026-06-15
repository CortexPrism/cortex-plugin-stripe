import type { Tool, ToolContext, PluginContext, ToolCallResult } from "cortex/plugins";

let config: Record<string, string> = {};

async function resolveConfig(ctx: PluginContext): Promise<Record<string, string>> {
  const secretKey = await ctx.config.get("stripeSecretKey");
  const publishableKey = await ctx.config.get("stripePublishableKey");
  return {
    stripeSecretKey: secretKey ?? "",
    stripePublishableKey: publishableKey ?? "",
  };
}

export async function onLoad(ctx: PluginContext): Promise<void> {
  config = await resolveConfig(ctx);
}

function stripeHeaders(): Record<string, string> {
  return {
    "Authorization": `Bearer ${config.stripeSecretKey}`,
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": "CortexPrism-StripePlugin/1.0.0",
  };
}

async function stripeFetch(path: string, options: RequestInit = {}, timeoutMs = 30000): Promise<{ ok: boolean; data: unknown; error?: string }> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`https://api.stripe.com/v1/${path}`, {
      ...options,
      headers: { ...stripeHeaders(), ...(options.headers as Record<string, string> || {}) },
      signal: controller.signal,
    });
    clearTimeout(t);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const errObj = data as Record<string, unknown> | null;
      return { ok: false, data: null, error: `Stripe error ${res.status}: ${errObj?.error && typeof errObj.error === "object" ? JSON.stringify(errObj.error) : res.statusText}` };
    }
    return { ok: true, data };
  } catch (e) {
    clearTimeout(t);
    if (e instanceof Error && e.name === "AbortError") return { ok: false, data: null, error: "Request timeout" };
    return { ok: false, data: null, error: e instanceof Error ? e.message : String(e) };
  }
}

const stripeListCustomersTool: Tool = {
  definition: {
    name: "stripe_list_customers",
    description: "List Stripe customers with optional email filter",
    params: [
      { name: "limit", type: "number", description: "Maximum customers", required: false, defaultValue: 20 },
      { name: "email", type: "string", description: "Filter by email", required: false },
    ],
    capabilities: ["network:fetch"],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const limit = typeof args.limit === "number" ? args.limit : 20;
      const email = typeof args.email === "string" && args.email ? args.email : null;
      let path = `customers?limit=${limit}`;
      if (email) path += `&email=${encodeURIComponent(email)}`;
      const result = await stripeFetch(path);
      if (!result.ok) {
        return { toolName: "stripe_list_customers", success: false, output: "", error: result.error || "List failed", durationMs: Date.now() - start };
      }
      return { toolName: "stripe_list_customers", success: true, output: JSON.stringify(result.data, null, 2), durationMs: Date.now() - start };
    } catch (error) {
      return { toolName: "stripe_list_customers", success: false, output: "", error: `Failed: ${error instanceof Error ? error.message : String(error)}`, durationMs: Date.now() - start };
    }
  },
};

const stripeGetCustomerTool: Tool = {
  definition: {
    name: "stripe_get_customer",
    description: "Get full details for a specific Stripe customer",
    params: [
      { name: "customer_id", type: "string", description: "Stripe customer ID", required: true },
    ],
    capabilities: ["network:fetch"],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const customerId = String(args.customer_id || "");
      if (!customerId) return { toolName: "stripe_get_customer", success: false, output: "", error: "customer_id is required", durationMs: Date.now() - start };
      const result = await stripeFetch(`customers/${encodeURIComponent(customerId)}`);
      if (!result.ok) {
        return { toolName: "stripe_get_customer", success: false, output: "", error: result.error || "Get failed", durationMs: Date.now() - start };
      }
      return { toolName: "stripe_get_customer", success: true, output: JSON.stringify(result.data, null, 2), durationMs: Date.now() - start };
    } catch (error) {
      return { toolName: "stripe_get_customer", success: false, output: "", error: `Failed: ${error instanceof Error ? error.message : String(error)}`, durationMs: Date.now() - start };
    }
  },
};

const stripeListProductsTool: Tool = {
  definition: {
    name: "stripe_list_products",
    description: "List Stripe products and their prices",
    params: [
      { name: "active_only", type: "boolean", description: "Only active products", required: false, defaultValue: true },
      { name: "limit", type: "number", description: "Maximum products", required: false, defaultValue: 20 },
    ],
    capabilities: ["network:fetch"],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const activeOnly = args.active_only !== false;
      const limit = typeof args.limit === "number" ? args.limit : 20;
      let path = `products?limit=${limit}`;
      if (activeOnly) path += "&active=true";
      const result = await stripeFetch(path);
      if (!result.ok) {
        return { toolName: "stripe_list_products", success: false, output: "", error: result.error || "List failed", durationMs: Date.now() - start };
      }
      return { toolName: "stripe_list_products", success: true, output: JSON.stringify(result.data, null, 2), durationMs: Date.now() - start };
    } catch (error) {
      return { toolName: "stripe_list_products", success: false, output: "", error: `Failed: ${error instanceof Error ? error.message : String(error)}`, durationMs: Date.now() - start };
    }
  },
};

const stripeCreateCheckoutTool: Tool = {
  definition: {
    name: "stripe_create_checkout",
    description: "Create a Stripe Checkout session for a customer",
    params: [
      { name: "customer_id", type: "string", description: "Stripe customer ID", required: true },
      { name: "price_id", type: "string", description: "Stripe price ID", required: true },
      { name: "success_url", type: "string", description: "Success redirect URL", required: true },
      { name: "cancel_url", type: "string", description: "Cancel redirect URL", required: true },
      { name: "quantity", type: "number", description: "Line item quantity", required: false, defaultValue: 1 },
    ],
    capabilities: ["network:fetch"],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const customerId = String(args.customer_id || "");
      const priceId = String(args.price_id || "");
      const successUrl = String(args.success_url || "");
      const cancelUrl = String(args.cancel_url || "");
      const quantity = typeof args.quantity === "number" ? args.quantity : 1;
      if (!customerId) return { toolName: "stripe_create_checkout", success: false, output: "", error: "customer_id is required", durationMs: Date.now() - start };
      if (!priceId) return { toolName: "stripe_create_checkout", success: false, output: "", error: "price_id is required", durationMs: Date.now() - start };
      if (!successUrl) return { toolName: "stripe_create_checkout", success: false, output: "", error: "success_url is required", durationMs: Date.now() - start };
      if (!cancelUrl) return { toolName: "stripe_create_checkout", success: false, output: "", error: "cancel_url is required", durationMs: Date.now() - start };
      const body = new URLSearchParams({
        "customer": customerId,
        "line_items[0][price]": priceId,
        "line_items[0][quantity]": String(quantity),
        "success_url": successUrl,
        "cancel_url": cancelUrl,
        "mode": "subscription",
      });
      const result = await stripeFetch("checkout/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      if (!result.ok) {
        return { toolName: "stripe_create_checkout", success: false, output: "", error: result.error || "Checkout creation failed", durationMs: Date.now() - start };
      }
      return { toolName: "stripe_create_checkout", success: true, output: JSON.stringify(result.data, null, 2), durationMs: Date.now() - start };
    } catch (error) {
      return { toolName: "stripe_create_checkout", success: false, output: "", error: `Failed: ${error instanceof Error ? error.message : String(error)}`, durationMs: Date.now() - start };
    }
  },
};

const stripeListSubscriptionsTool: Tool = {
  definition: {
    name: "stripe_list_subscriptions",
    description: "List subscriptions with optional filters",
    params: [
      { name: "customer_id", type: "string", description: "Filter by customer ID", required: false },
      { name: "status", type: "string", description: "Filter by status", required: false, defaultValue: "active", options: ["active", "past_due", "canceled", "all"] },
    ],
    capabilities: ["network:fetch"],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const customerId = typeof args.customer_id === "string" && args.customer_id ? args.customer_id : null;
      const status = typeof args.status === "string" ? args.status : "active";
      let path = "subscriptions?limit=50";
      if (customerId) path += `&customer=${encodeURIComponent(customerId)}`;
      if (status && status !== "all") path += `&status=${encodeURIComponent(status)}`;
      const result = await stripeFetch(path);
      if (!result.ok) {
        return { toolName: "stripe_list_subscriptions", success: false, output: "", error: result.error || "List failed", durationMs: Date.now() - start };
      }
      return { toolName: "stripe_list_subscriptions", success: true, output: JSON.stringify(result.data, null, 2), durationMs: Date.now() - start };
    } catch (error) {
      return { toolName: "stripe_list_subscriptions", success: false, output: "", error: `Failed: ${error instanceof Error ? error.message : String(error)}`, durationMs: Date.now() - start };
    }
  },
};

const stripeRevenueReportTool: Tool = {
  definition: {
    name: "stripe_revenue_report",
    description: "Generate a revenue summary report for a time period",
    params: [
      { name: "period", type: "string", description: "Aggregation period", required: true, options: ["daily", "weekly", "monthly", "yearly"] },
      { name: "start_date", type: "string", description: "Start date YYYY-MM-DD", required: false },
    ],
    capabilities: ["network:fetch"],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const period = String(args.period || "");
      if (!["daily", "weekly", "monthly", "yearly"].includes(period)) {
        return { toolName: "stripe_revenue_report", success: false, output: "", error: "period must be one of: daily, weekly, monthly, yearly", durationMs: Date.now() - start };
      }
      let path = "balance_transactions?limit=100";
      if (typeof args.start_date === "string" && args.start_date) {
        const startTs = Math.floor(new Date(args.start_date).getTime() / 1000);
        path += `&created[gte]=${startTs}`;
      }
      const result = await stripeFetch(path);
      if (!result.ok) {
        return { toolName: "stripe_revenue_report", success: false, output: "", error: result.error || "Report failed", durationMs: Date.now() - start };
      }
      const data = result.data as Record<string, unknown> | null;
      const transactions = (data?.data as Array<Record<string, unknown>>) || [];
      const totalAmount = transactions.reduce((sum: number, t: Record<string, unknown>) => sum + (Number(t.amount) || 0), 0) / 100;
      const totalFees = transactions.reduce((sum: number, t: Record<string, unknown>) => sum + (Number(t.fee) || 0), 0) / 100;
      const report = {
        period,
        start_date: typeof args.start_date === "string" ? args.start_date : null,
        transaction_count: transactions.length,
        total_revenue: totalAmount,
        total_fees: totalFees,
        net_revenue: totalAmount - totalFees,
        generated_at: new Date().toISOString(),
      };
      return { toolName: "stripe_revenue_report", success: true, output: JSON.stringify(report, null, 2), durationMs: Date.now() - start };
    } catch (error) {
      return { toolName: "stripe_revenue_report", success: false, output: "", error: `Failed: ${error instanceof Error ? error.message : String(error)}`, durationMs: Date.now() - start };
    }
  },
};

export async function onUnload(_ctx: PluginContext): Promise<void> {}

export const tools: Tool[] = [
  stripeListCustomersTool,
  stripeGetCustomerTool,
  stripeListProductsTool,
  stripeCreateCheckoutTool,
  stripeListSubscriptionsTool,
  stripeRevenueReportTool,
];
