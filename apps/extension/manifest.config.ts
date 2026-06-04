import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "ProofPath Capture",
  description: "Process capture for Google Docs and Word Online",
  version: "0.1.0",
  permissions: ["storage", "activeTab"],
  host_permissions: [
    "https://docs.google.com/*",
    "https://*.officeapps.live.com/*",
    "http://localhost:8000/*",
  ],
  background: {
    service_worker: "src/background/service-worker.ts",
    type: "module",
  },
  action: {
    default_popup: "src/popup/index.html",
    default_title: "ProofPath",
  },
  content_scripts: [
    {
      matches: ["https://docs.google.com/document/*"],
      js: ["src/content/google-docs.ts"],
      run_at: "document_idle",
    },
    {
      matches: ["https://*.officeapps.live.com/*"],
      js: ["src/content/word-online.ts"],
      run_at: "document_idle",
    },
  ],
});
