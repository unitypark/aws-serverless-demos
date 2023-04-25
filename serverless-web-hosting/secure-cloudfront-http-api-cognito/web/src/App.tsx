import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import HomeContainer from "./containers/Home";
import { createContext } from "react";

interface AppContextInterface {
  origin: string
  username: string;
  role: string;
}

export const AppCtx = createContext<AppContextInterface>({
  origin: '',
  username: '',
  role: ''
});

// Provider in your app
const appContext: AppContextInterface = {
  origin: getApiOrigin(window.location.origin),
  username: '',
  role: ''
};

function getApiOrigin (origin: string): string {
  if (origin.match(/localhost/)) {
    return "http://localhost:8080";
  } else {
    return `${window.location.origin}`;
  }
};

function App() {
  return (
    <AppCtx.Provider value={appContext}>
      <Router>
        <Switch>
          <Route exact path="/">
            <HomeContainer />
          </Route>
        </Switch>
      </Router>
    </AppCtx.Provider>
  );
}

export default App;