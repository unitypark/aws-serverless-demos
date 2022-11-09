import React from "react";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import Card from "@material-ui/core/Card";
import Signup from "./components/Signup";
import Confirmation from "./components/Confirmation";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";

const App: React.FC = () => {
  return (
    <Router>
      <Card style={{ width: 500, margin: "100px auto", padding: "40px" }}>
        <Switch>
          <Route path="/signup">
            <Signup />
          </Route>
          <Route path="/signin">
            <Login />
          </Route>
          <Route path="/confirmation">
            <Confirmation />
          </Route>
          <Route path="/">
            <ProtectedRoute component={Dashboard} />
          </Route>
        </Switch>
      </Card>
    </Router>
  );
};

export default App;
