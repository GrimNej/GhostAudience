import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app/App";
import "./design-system/global.css";

const rootElement =
  document.querySelector<HTMLDivElement>("#root");

if (rootElement === null) {
  throw new Error(
    "The #root application element is missing.",
  );
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);