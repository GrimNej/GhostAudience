import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app/App";
import "./design-system/global.css";
import { registerApplicationServiceWorker } from "./infrastructure/pwa/register-service-worker";

const rootElement = document.querySelector<HTMLDivElement>("#root");

if (rootElement === null) {
  throw new Error("The #root application element is missing.");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if ("serviceWorker" in navigator) {
  registerApplicationServiceWorker({
    onUpdateAvailable: () => undefined,
    onOfflineReady: () => undefined,
    onRegistrationError: (error) => {
      console.warn("service_worker_registration_failed", error.name);
    },
  });
}
