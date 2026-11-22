const SERVER_INFO = { name: "zuno-icon-store", version: "1.0.0" };
const TOOLS = [
  {
    name: "search_icons",
    description: "Search public ZUNO Icon Store icons by title. Read-only. Use this to find existing icons before creating a new one.",
    inputSchema: { type: "object", properties: { search: { type: "string", description: "Optional title search, max 60 characters." } }, additionalProperties: false }
  },
  {
    name: "create_icon_draft",
    description: "Save an AI-generated icon image as a PRIVATE DRAFT in the connected user's ZUNO account. The AI must generate the image first and pass its PNG, JPEG, or WebP bytes as base64. This never publishes the icon. The user must open ZUNO AI Connect and approve publication themselves.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", minLength: 2, maxLength: 60 },
        description: { type: "string", maxLength: 500 },
        category: { type: "string", enum: ["Minimal", "Dark", "Colorful", "Gradient", "Other"] },
        mime_type: { type: "string", enum: ["image/png", "image/jpeg", "image/webp"] },
        image_base64: { type: "string", description: "Base64-encoded image bytes, without needing a data URL prefix. Maximum 8 MB decoded." }
      },
      required: ["title", "mime_type", "image_base64"],
      additionalProperties: false
    }
  },
  {
    name: "list_my_drafts",
    description: "List the connected user's private AI-generated icon drafts. Does not publish or modify them.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
  }
];

function reply(id, result) {
  return Response.json({ jsonrpc: "2.0", id, result }, { headers: corsHeaders() });
}
function fail(id, code, message) {
  return Response.json({ jsonrpc: "2.0", id, error: { code, message } }, { headers: corsHeaders() });
}
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type, mcp-session-id, mcp-protocol-version",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
    "Cache-Control": "no-store"
  };
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/") {
      return Response.json({ service: "ZUNO Icon Store MCP", endpoint: "/mcp", protocol: "Streamable HTTP", version: SERVER_INFO.version }, { headers: corsHeaders() });
    }
    if (request.method !== "POST" || url.pathname !== "/mcp") {
      return new Response("Not found", { status: 404, headers: corsHeaders() });
    }
    let message;
    try { message = await request.json(); } catch { return fail(null, -32700, "Invalid JSON"); }
    if (!message || message.jsonrpc !== "2.0" || typeof message.method !== "string") return fail(message?.id ?? null, -32600, "Invalid JSON-RPC request");

    if (message.method === "notifications/initialized" || message.method === "notifications/cancelled") {
      return new Response(null, { status: 202, headers: corsHeaders() });
    }
    if (message.method === "initialize") {
      return reply(message.id, {
        protocolVersion: message.params?.protocolVersion || "2025-06-18",
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: "ZUNO Icon Store lets the connected user search public icons and save AI-generated images as private drafts. Never claim an icon is published after create_icon_draft. The user must approve publication on the ZUNO website."
      });
    }
    if (message.method === "ping") return reply(message.id, {});
    if (message.method === "tools/list") return reply(message.id, { tools: TOOLS });
    if (message.method !== "tools/call") return fail(message.id ?? null, -32601, "Method not found");

    const auth = request.headers.get("Authorization") || "";
    if (!/^Bearer\s+zuno_mcp_[A-Za-z0-9_-]{30,}$/i.test(auth)) {
      return fail(message.id ?? null, -32001, "Connect a ZUNO personal MCP token in the MCP client's authorization settings.");
    }
    const name = message.params?.name;
    const args = message.params?.arguments || {};
    const actions = {
      search_icons: "list_icons",
      create_icon_draft: "create_draft",
      list_my_drafts: "list_drafts"
    };
    const action = actions[name];
    if (!action) return fail(message.id ?? null, -32602, "Unknown ZUNO tool");

    try {
      const response = await fetch(env.SUPABASE_MCP_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Authorization": auth,
          "apikey": env.SUPABASE_ANON_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action, input: args })
      });
      const payload = await response.json().catch(() => ({ error: "Invalid backend response" }));
      if (!response.ok) {
        const text = payload?.error || "ZUNO request failed";
        return reply(message.id, { isError: true, content: [{ type: "text", text }] });
      }
      return reply(message.id, { content: [{ type: "text", text: JSON.stringify(payload) }], structuredContent: payload });
    } catch (error) {
      return reply(message.id, { isError: true, content: [{ type: "text", text: error instanceof Error ? error.message : "ZUNO backend unavailable" }] });
    }
  }
};
