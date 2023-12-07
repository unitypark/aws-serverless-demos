import React, { useState } from 'react';
import './Search.css';
import SearchIcon from '@mui/icons-material/Search';
import Button from '@mui/material/Button';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { useNavigate } from 'react-router-dom';
import { useStateValue } from '../StateProvider';
import { actionTypes } from '../reducer';

function Search({ hideButtons = false }) {
  const [{}, dispatch] = useStateValue();
  const [input, setInput] = useState('');
  const navigate = useNavigate();

  const search = (e) => {
    e.preventDefault();
    // console.log("buttom clicked", input);

    dispatch({
      type: actionTypes.SET_SEARCH_TERM,
      term: input,
    });

    navigate('/search');
  };

  return (
    <form className="search">
      <div className="search__input">
        <SearchIcon className="search__inputIcon" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="search from aws opensearch index with reddit dataset"
        />
      </div>
      {!hideButtons ? (
        <div className="search__buttons">
          <Button onClick={search} type="submit" variant="outlined">
            Say HELLO to the AWS OpenSearch <KeyboardArrowRightIcon />
          </Button>
        </div>
      ) : (
        <div className="search__buttons">
          <Button
            onClick={search}
            className="search__buttonsHidden"
            type="submit"
            variant="outlined"
          >
            Say HELLO to the AWS OpenSearch <KeyboardArrowRightIcon />
          </Button>
        </div>
      )}
    </form>
  );
}

export default Search;
