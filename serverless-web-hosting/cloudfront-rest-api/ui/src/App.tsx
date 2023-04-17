import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import HomeContainer from "./containers/Home";
import UploadContainer from "./containers/Uploader";
import DownloadContainer from "./containers/Downloader";

function App() {
  return (
    <Router>
      <Switch>
        <Route exact path="/">
          <HomeContainer />
        </Route>
        <Route exact path="/uploads">
          <UploadContainer />
        </Route>
        <Route exact path="/downloads">
          <DownloadContainer />
        </Route>
      </Switch>
    </Router>
  );
}

export default App;
  