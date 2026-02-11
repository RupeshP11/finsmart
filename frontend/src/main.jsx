import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

import "./styles/theme.css";
import "./styles/base.css";
import "./styles/responsive.css";
import "./styles/app.css";
import "./styles/navbar.css";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
