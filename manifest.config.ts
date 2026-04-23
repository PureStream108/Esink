import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "E Sink",
  version: "0.1.0",
  description: "Directory and input fuzz helper for Edge.",
  action: {
    default_title: "Open E Sink"
  },
  background: {
    service_worker: "src/background/service-worker.ts",
    type: "module"
  },
  permissions: ["storage", "tabs", "scripting", "activeTab", "contextMenus"],
  host_permissions: ["http://*/*", "https://*/*"],
  options_ui: {
    page: "src/window/index.html",
    open_in_tab: false
  },
  content_scripts: [
    {
      matches: ["http://*/*", "https://*/*"],
      js: ["src/content/content-script.ts"],
      run_at: "document_idle"
    }
  ]
});
