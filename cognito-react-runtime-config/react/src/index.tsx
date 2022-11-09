import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import * as serviceWorker from "./serviceWorker";
import ReactNotification from "react-notifications-component";
import { Amplify } from "aws-amplify";
import "react-notifications-component/dist/theme.css";

Amplify.Logger.LOG_LEVEL = "DEBUG";

fetch(process.env.PUBLIC_URL + '/runtime-config.json')
  .then((response) => response.json())
  .then((runtimeContext) => {
    Amplify.configure({
      aws_project_region: runtimeContext.region,
      aws_cognito_region:  runtimeContext.region,
      aws_user_pools_id: runtimeContext.userPoolId,
      aws_user_pools_web_client_id: runtimeContext.appClientId, 
    });
    ReactDOM.render(
      <React.StrictMode>
        <ReactNotification />
        <App />
      </React.StrictMode>,
      document.getElementById("root")
    );
  }).catch((e) => console.log(e));


// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
