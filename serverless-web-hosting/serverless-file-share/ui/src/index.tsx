import React from "react";
import ReactDOM from "react-dom";
// import { ChakraProvider } from "@chakra-ui/react";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { createContext } from "react";

interface AppContextInterface {
  origin: string;
}

export const AppCtx = createContext<AppContextInterface | null>(null);

// Provider in your app
var appContext: AppContextInterface = {
  // e.g. https://example.cloudfront.net
  origin: `${window.location.origin}`,
};

ReactDOM.render(
  <React.StrictMode>
    <AppCtx.Provider value={appContext}>
      <App />
    </AppCtx.Provider>
  </React.StrictMode>,
  document.getElementById("root")
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
reportWebVitals();
