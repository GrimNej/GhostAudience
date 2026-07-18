/** @type {import("dependency-cruiser").IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "domain-is-pure",
      comment:
        "The domain package must not depend on frameworks, storage, browser APIs, or providers.",
      severity: "error",
      from: { path: "^packages/domain/src" },
      to: {
        path:
          "^(apps/|packages/contracts|packages/parser|react|xstate|zod|dexie|hono|@cloudflare)",
      },
    },
    {
      name: "parser-does-not-call-ai-or-storage",
      severity: "error",
      from: { path: "^packages/parser/src" },
      to: {
        path: "^(apps/studio/worker|apps/studio/src/infrastructure|dexie|hono)",
      },
    },
    {
      name: "presentation-does-not-call-infrastructure-directly",
      severity: "error",
      from: { path: "/presentation/" },
      to: {
        path: "/infrastructure/",
      },
    },
    {
      name: "worker-does-not-import-browser-source",
      severity: "error",
      from: { path: "^apps/studio/worker" },
      to: {
        path: "^apps/studio/src",
      },
    },
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: {
      path: "node_modules",
    },
    exclude: {
      path: "(^|/)dist/|(^|/)coverage/|(^|/)test-results/",
    },
    tsConfig: {
      fileName: "tsconfig.base.json",
    },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["types", "import", "default"],
    },
    reporterOptions: {
      dot: {
        collapsePattern: "node_modules/[^/]+",
      },
    },
  },
};