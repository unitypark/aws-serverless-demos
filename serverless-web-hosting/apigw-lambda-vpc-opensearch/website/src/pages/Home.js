import React from 'react';
import './Home.css';
import Search from '../components/Search';
// import { Link } from "react-router-dom";

function Home() {
  return (
    <div className="home">
      <div className="home__body">
        <p>aws_opensearch</p>
        <div className="home_inputContainer">
          <Search />
        </div>
      </div>
    </div>
  );
}

export default Home;
