import React from 'react';
import './App.css';

function App() {
  const [count, setCount] = React.useState(0);
  const [searchTime, setSearchTime] = React.useState(0);
  const [query, setQuery] = React.useState('website');
  const [list, setList] = React.useState(null);

  const search = async (e) => {
    e.preventDefault();

    const q = encodeURIComponent(query);
    await fetch(
      `https://${process.env.REACT_APP_OS_DOMAIN}/reddit/_search?from=0&size=20&q=${q}`,
      {
        method: 'GET',
        headers: {
          Authorization: process.env.REACT_APP_OS_AUTH,
        },
      }
    )
      .then((res) => {
        return res.json();
      })
      .then((result) => {
        setSearchTime(result.took);
        setCount(result.hits.total.value);
        setList(result.hits.hits);
      });
  };

  return (
    <div className="app">
      <form onSubmit={search}>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button>Search</button>
      </form>

      {!list ? null : list.length === 0 ? (
        <p>
          <i>No results</i>
        </p>
      ) : (
        <ul>
          <span className="info">
            ✅ About {count} results ({searchTime} ms)
          </span>
          {list.map((item, i) => (
            <Item key={i} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Item({ item }) {
  return (
    <li className="item">
      <h2 className="title">
        <a href={item._source.url} target="_blank">
          {item._source.title}
        </a>
      </h2>

      <p className="description">{item._source.body}</p>
      <p className="comment">
        <span>{item._source.comment}</span>
      </p>

      <div className="meta">
        <span>{item._id}</span>
        <span>{item._score}</span>
        <span>{item._index}</span>
      </div>
    </li>
  );
}

export default App;
