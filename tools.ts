// tools.ts — external MCP servers for the native-gift-with-purchase plugin.
//
// This file is only EVALUATED to read the `mcpServers` config object — keep it to
// plain config, not work. Actual tool execution happens out-of-process in the
// external MCP server (never inside the Theme Factory process).
//
// The Shopify Dev MCP gives the analyzer/dev/validator agents build-time lookups so
// they emit a correct native GWP without guessing at API shapes:
//   - the /cart/add.js line-item `properties` shape and /cart/change.js by line
//   - cart object fields (total_price, original_total_price, items[].properties)
//   - Product / Variant lookups (the configured gift variant id)
// It runs via `npx`, so nothing needs to be pre-installed on the build host.
//
// Registered to the agents as `plugin-native-gift-with-purchase-shopify`; its tools
// appear namespaced under that server. The connection only exists while engaged.

export const mcpServers = {
  shopify: {
    type: "stdio",
    command: "npx",
    args: ["-y", "@shopify/dev-mcp@latest"],
  }
};
