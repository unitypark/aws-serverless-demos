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
      `${process.env.REACT_APP_API_DOMAIN}/search/?query=${q}`
    )
      .then((response) => response.json())
      .then((result) => {
        setSearchTime(result.data.time);
        setCount(result.data.total);
        setList(result.data.documents);
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
        <a href={item.reddit.url} target="_blank">
          {item.reddit.title}
        </a>
      </h2>

      <p className="description">{item.reddit.body}</p>
      <p className="comment">
        <span>{item.reddit.comment}</span>
      </p>

      <div className="meta">
        <span>{item.id}</span>
        <span>{item.score}</span>
        <span>{item.index}</span>
      </div>
    </li>
  );
}

export default App;
