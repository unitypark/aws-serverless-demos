import React, { CSSProperties, useEffect, useState } from "react";
import { CognitoUser } from "amazon-cognito-identity-js";
import {  Hub } from "@aws-amplify/core";
import { Auth } from "@aws-amplify/auth";
import App from "./App";
import ClipLoader from 'react-spinners/ClipLoader';

const override: CSSProperties = {
    borderColor: "green",
    borderRadius: "3px", 
    position: "fixed", 
    top: "50%", 
    left: "50%", 
    transform: "translate(-50%, -50%)"
};

const AuthenticatedApp = () => {
  const [authenticatedUser, setAuthenticatedUser] = useState<CognitoUser>();
  let [loading, setLoading] = useState(true);
  let [color, setColor] = useState("#ffffff");

  const getUser = () => {
    return Auth.currentAuthenticatedUser()
      .then((userData) => userData)
      .catch(() => {
        console.log("Not signed in");
        Auth.federatedSignIn({
          customProvider: "vwgroup.cloud.idp",
        })
          .then((cred) => {
            // If success, you will get the AWS credentials.
            console.log("If success, you will get the AWS credentials", cred);
            return Auth.currentAuthenticatedUser();
          })
          .catch((e) => {
            console.log("Error signing in federated user", e);
          });
      });
  };
  useEffect(() => {
    Hub.listen("auth", ({ payload: { event, data } }) => {
      console.log("auth event", event);
      switch (event) {
        case "signIn":
          getUser().then((userData) => {
            console.log("signIn", userData);
            setAuthenticatedUser(userData);
          });
          break;
        case "cognitoHostedUI":
          getUser().then((userData) => {
            console.log("cognitoHostedUI", userData);
            setAuthenticatedUser(userData);
          });
          break;
        case "signOut":
          Auth.signOut();
          setAuthenticatedUser(undefined);
          break;
        case "signIn_failure":
          Auth.signOut();
          break;
        case "cognitoHostedUI_failure":
          console.log("Sign in failure", data);
          Auth.signOut();
          break;
      }
    });
    getUser().then((userData) => {
      setAuthenticatedUser(userData);
    });
  }, []);

  if (!authenticatedUser) {
    return <ClipLoader
    color={color}
    loading={loading}
    cssOverride={override}
    size={50}
    aria-label="Loading Spinner"
    data-testid="loader"
  />
  }
  return <App />;
};

export default AuthenticatedApp;
