import React from 'react';
import './SearchPage.css';
import Search from '../components/Search';
import { Link } from 'react-router-dom';
import useOpenSearch from '../useOpenSearch';
import { useStateValue } from '../StateProvider';
// import Response from "../response";

function SearchPage() {
  const [{ term }, dispatch] = useStateValue();

  // LIVE API CALL
  const { data } = useOpenSearch(term);

  // MOCK API CALL
  //   const data = Response;
  //   console.log(data);

  return (
    <div className="searchPage">
      <div className="searchPage__header">
        <Link className="searchPage__logo" to="/">
          <p>aws</p>
          <p>_opensearch</p>
        </Link>
        <div className="searchPage__headerBody">
          <Search hideButtons />
        </div>
      </div>
      {/* {true && ( */}
      {term && (
        <div className="searchPage__results">
          <p className="searchPage__resultCount">
            About {data?.total} results ({data?.time} seconds) for{' '}
            {term}
          </p>

          {data?.documents.map((doc) => (
            <div className="searchPage__result">
              <a
                className="searchPage__resultTitle"
                href={doc.reddit.url}
              >
                <h2>{doc.reddit.title}</h2>
              </a>
              <a
                className="searchPage__resultLink"
                href={doc.reddit.url}
              >
                {doc.pagemap?.cse_thumbnail?.length > 0 &&
                  doc.pagemap?.cse_thumbnail[0]?.src && (
                    <img
                      className="searchPage__resultImage"
                      src={doc.pagemap?.cse_thumbnail[0]?.src}
                      alt=""
                    />
                  )}
                {doc.reddit.url}
              </a>
              <p className="searchPage__resultSummary">
                index: {doc.index}, score: {doc.score}
              </p>
              <p className="searchPage__resultSnippet">
                {doc.reddit.comment}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SearchPage;
