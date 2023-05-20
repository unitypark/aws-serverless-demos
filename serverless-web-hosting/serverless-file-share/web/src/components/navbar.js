import '../css/navbar.css'
import React from 'react'
import { Navbar } from 'reactstrap'
import { Link } from 'react-router-dom'

const NavBar = (props) => {
    return (
        <div className="Navbar">
            <Navbar color="transparent" light expand="md">
                <Link to="/">
                    <img
                        src={require('./image/logo.png')}
                        className="Brand"
                        width="60px"
                        alt="logo of SwiftShare website"
                    />
                </Link>
            </Navbar>
        </div>
    )
}

export default NavBar
