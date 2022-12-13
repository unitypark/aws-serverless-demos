import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import HomeContainer from "./containers/Home";
import HandleRedirectContainer from "./containers/HandleRedirect";

function App() {
  return (
    <Router>
      <Switch>
        <Route exact path="/">
          <HomeContainer />
        </Route>
        <Route exact path="/:shortId">
          <HandleRedirectContainer />
        </Route>
      </Switch>
    </Router>
  );
}

export default App;
