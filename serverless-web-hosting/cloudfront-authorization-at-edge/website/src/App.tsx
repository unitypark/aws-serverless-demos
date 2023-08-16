import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import HomeContainer from "./containers/Home";
import DownloaderContainer from "./containers/Downloader";
import ApiErrorHandler from "./api/ErrorHandler";

function App() {
  return (
      <Router>
        <Switch>
          <Route exact path="/">
            <HomeContainer />
          </Route>
          <Route exact path="/downloader">
            <DownloaderContainer />
          </Route>
        </Switch>
        <ApiErrorHandler />
      </Router>
  );
}

export default App;
