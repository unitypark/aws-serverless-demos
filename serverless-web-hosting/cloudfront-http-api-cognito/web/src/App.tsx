import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import HomeContainer from "./containers/Home";
import DownloaderContainer from "./containers/Downloader";
import DrawerAppBar from "./components/Navbar";
import { getCookies } from "typescript-cookie";
import { createContext } from "react";

interface AppContextInterface {
  origin: string
  idToken: string;
  username: string;
  role: string;
}

export const AppCtx = createContext<AppContextInterface>({
  origin: '',
  idToken: '',
  username: '',
  role: ''
});

// Provider in your app
const appContext: AppContextInterface = {
  origin: `${window.location.origin}`,
  idToken: getIdToken(getCookies()),
  username: '',
  role: ''
};

function getIdToken(cookies: {
  [property: string]: string;
}): string {
    let tokenCookieNamePrefix = 'CognitoIdentityServiceProvider.';
    let tokenCookieNamePostfix = '.idToken';
    let idToken = "";
    for (let key in cookies) {
      if (key.startsWith(tokenCookieNamePrefix) && key.endsWith(tokenCookieNamePostfix)) {
      idToken = cookies[key];
      break;
    }
  }
  return idToken;
}

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