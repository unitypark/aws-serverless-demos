import Home from './components/home'
import NavBar from './components/navbar'
import Send from './components/send'
import Receive from './components/receive'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

function App() {
    return (
        <Router>
            <div className="App">
                <NavBar />
                <Routes>
                    <Route path="/" exact element={<Home />} />
                    <Route path="/send" element={<Send />} />
                    <Route path="/download" element={<Receive />} />
                </Routes>
            </div>
        </Router>
    )
}

export default App
