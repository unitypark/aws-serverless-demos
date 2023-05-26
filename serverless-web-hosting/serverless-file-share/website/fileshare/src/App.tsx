import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import HomeContainer from "./containers/Home";
import DownloaderContainer from "./containers/Downloader";
import { createContext } from "react";

interface AppContextInterface {
  origin: string
  username: string;
  isAdmin: boolean;
}

export const AppCtx = createContext<AppContextInterface>({
  origin: '',
  username: '',
  isAdmin: false,
});

// Provider in your app
const appContext: AppContextInterface = {
  origin: `${window.location.origin}`,
  username: '',
  isAdmin: false,
};

function App() {
  return (
    <AppCtx.Provider value={appContext}>
      <Router>
        <Switch>
          <Route exact path="/">
            <HomeContainer />
          </Route>
          <Route exact path="/downloader">
            <DownloaderContainer />
          </Route>
        </Switch>
      </Router>
    </AppCtx.Provider>
  );
}

export default App;