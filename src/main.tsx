import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { restoreStaticRoute } from "./demo/navigation";

restoreStaticRoute();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
