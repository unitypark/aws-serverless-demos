import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import HomeContainer from "./containers/Home";
import DownloaderContainer from "./containers/Downloader";

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
    </Router>
  );
}

export default App;