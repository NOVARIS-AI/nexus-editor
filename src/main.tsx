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
