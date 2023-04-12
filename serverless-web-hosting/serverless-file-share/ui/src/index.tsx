import React from "react";
import ReactDOM from "react-dom";
// import { ChakraProvider } from "@chakra-ui/react";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { createContext } from "react";

interface AppContextInterface {
  apiEndpoint: string;
}

export const AppCtx = createContext<AppContextInterface | null>(null);

// Provider in your app
var appContext: AppContextInterface = {
  apiEndpoint: "http://localhost:8080",
};

fetch(process.env.PUBLIC_URL + '/runtime-config.json')
  .then((response) => response.json())
  .then((runtimeContext) => {
    appContext.apiEndpoint = runtimeContext.apiEndpoint
    ReactDOM.render(
      <React.StrictMode>
        <AppCtx.Provider value={appContext}>
          <App />
        </AppCtx.Provider>
      </React.StrictMode>,
      document.getElementById("root")
    );
  }).catch((e) => console.log(e));

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
reportWebVitals();
