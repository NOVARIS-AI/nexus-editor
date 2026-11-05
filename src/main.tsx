import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthGate } from "./lib/AuthGate";
import "./styles.css";
ReactDOM.createRoot(document.getElementById("root")!).render(
  React.createElement(React.StrictMode, null,
    React.createElement(AuthGate, null, React.createElement(App))
  )
);
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(error => {
      console.warn("NEXUS offline shell registration was unavailable.", error);
    });
  }, { once: true });
}
