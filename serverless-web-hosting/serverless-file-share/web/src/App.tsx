import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import HomeContainer from "./containers/Home";
import DownloaderContainer from "./containers/Downloader";
import DrawerAppBar from "./components/Navbar";
import { getCookies } from "typescript-cookie";
import { createContext } from "react";

interface AppContextInterface {
  origin: string
  username: string;
  role: string;
  isAdmin: boolean;
}

export const AppCtx = createContext<AppContextInterface>({
  origin: '',
  username: '',
  role: '',
  isAdmin: false,
});

// Provider in your app
const appContext: AppContextInterface = {
  origin: `${window.location.origin}`,
  username: '',
  role: '',
  isAdmin: false,
};

function App() {
  return (
    <AppCtx.Provider value={appContext}>
      <Router>
        <DrawerAppBar />
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