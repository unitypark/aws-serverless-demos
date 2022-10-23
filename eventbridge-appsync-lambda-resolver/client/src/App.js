import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "@popperjs/core";
import "bootstrap";
import logo from "./logo.svg";
import "./App.css";
import Amplify, { API, graphqlOperation } from "aws-amplify";
import * as subscriptions from "./graphql/subscriptions"; //codegen generated code
import * as mutations from "./graphql/mutations"; //codegen generated code

//AppSync endpoint settings
const appConfig = {
  aws_appsync_graphqlEndpoint:
    "https://xxxxxxxxxxxxxx.appsync-api.us-west-2.amazonaws.com/graphql",
  aws_appsync_region: "us-west-2",
  aws_appsync_authenticationType: "API_KEY",
  aws_appsync_apiKey: "da2-xxxxxxxxxxxxxxxxxx",
};

Amplify.configure(appConfig);

function App() {
  const [topic, setTopic] = useState("");
  const [topicName, setTopicName] = useState("");
  const [text, setText] = useState("");
  const [receivedMessages, setReceivedMessages] = useState([]);
  const [display, setDisplay] = useState(false);
  let messages = [];

  //Publish data to subscribed clients
  async function handleSubmit(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    await API.graphql(
      graphqlOperation(mutations.createMessage, { topic: topic, text: text })
    );
    setTopicName(topic);
    setTopic("");
    setText("");
    setDisplay(true);
  }

  useEffect(() => {
    const subscription = API.graphql(
      graphqlOperation(subscriptions.onCreateMessage)
    ).subscribe({
      next: ({ provider, value }) => {
        setReceivedMessages(prevArray => [
          ...prevArray,
          {
            topic: value.data.onCreateMessage.topic,
            text: value.data.onCreateMessage.text
          },
        ]);
      },
      error: (error) => console.warn(error),
    });
    return () => subscription.unsubscribe();
  }, [topicName]);


  if (receivedMessages) {
    //messages.push(received);
    messages = [].concat(receivedMessages).map((msg, i) => (
      <div>
        <div>
          <div className="w-25 p-3 d-inline-block badge bg-secondary p-0 rounded p-2">
            <span>{msg.topic}</span>
          </div>
          <div className="w-75 p-2 d-inline-block alert alert-secondary">
            <span>{msg.text}</span>
          </div>
        </div>
      </div>
    ));
  }

  //Display pushed data on browser
  return (
    <div className="App bg-secondary">
      <br />
      <br />
      <div className="container-md border shadow p-3 mb-5 bg-body rounded-3">
        <img src={logo} className="App-logo" alt="logo" />
        <form>
          <div className="input-group mb-3">
            <button
              className="btn btn-outline-light btn-dark dropdown-toggle"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              Topic
            </button>
            <ul className="dropdown-menu">
              <li>
                <p
                  className="dropdown-item"
                  onClick={(e) => setTopic("Lambda")}
                >
                  Lambda
                </p>
              </li>
              <li>
                <p
                  className="dropdown-item"
                  onClick={(e) => setTopic("AppSync")}
                >
                  AppSync
                </p>
              </li>
              <li>
                <p
                  className="dropdown-item"
                  onClick={(e) => setTopic("DynamoDB")}
                >
                  DynamoDB
                </p>
              </li>
              <li>
                <p
                  className="dropdown-item"
                  onClick={(e) => setTopic("EventBridge")}
                >
                  EventBridge
                </p>
              </li>
              <li>
                <p
                  className="dropdown-item"
                  onClick={(e) => setTopic("IoT")}
                >
                  IoT
                </p>
              </li>
            </ul>
            <input
              type="text"
              className="form-control"
              value={topic}
              aria-label="Channel"
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          <div className="input-group mb-3">
            <input
              type="text"
              className="form-control"
              placeholder="Text"
              aria-label="Text"
              aria-describedby="button-addon2"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button
              onClick={handleSubmit}
              className="btn btn-outline-light btn-dark"
              type="button"
              id="button-addon2"
            >
              Send
            </button>
          </div>
        </form>
      </div>
      {display ? (
        <div className="container-md border shadow p-3 mb-5 bg-body rounded-3">
          <p className="badge fs-3 bg-dark p-0 rounded p-2">Send message from AWS console</p>
          <div className="bg-light p-0 rounded p-2">
            <span>{messages}</span>
          </div>
        </div>
      ) : null}
      <br />
    </div>
  );
}

export default App;