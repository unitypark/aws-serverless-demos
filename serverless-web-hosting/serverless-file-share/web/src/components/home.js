import React, { useState } from 'react'
import '../css/home.css'
import { Navigate } from 'react-router'

function App() {
    const [redirect, setRedirect] = useState({
        sendRedirect: false,
        recieveRedirect: false,
    })
    const handleOnClickSend = () => {
        setRedirect((prev) => ({ ...prev, sendRedirect: true }))
    }
    const handleOnClickRecieve = () => {
        setRedirect((prev) => ({ ...prev, recieveRedirect: true }))
    }

    if (redirect.sendRedirect) {
        return <Navigate to="/send" />
    } else if (redirect.recieveRedirect) {
        return <Navigate to="/download" />
    }
    return (
        <div className="MainContainer">
            <div className="centralPanel">
                <div className="panelContent">
                    <h1>Swiftshare.</h1>
                    <p>
                        It is a file sharing app which allows you to upload and
                        share a file from your pc or mobile and transfer it to
                        anyone across the internet quickly and easily.
                    </p>
                    <div className="lead">
                        <div className="Selection">
                            <button
                                id="send"
                                className="Selection-button"
                                onClick={handleOnClickSend}
                            >
                                Send File
                            </button>{' '}
                            <br />
                            <button
                                id="recieve"
                                className="Selection-button"
                                onClick={handleOnClickRecieve}
                            >
                                Download File
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="imgPanel">
                <img
                    src={require('./image/landing.jpg')}
                    alt="sharing file"
                    className="landingImage"
                />
            </div>
        </div>
    )
}

export default App
