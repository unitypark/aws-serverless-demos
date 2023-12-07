import { useState, useEffect } from 'react';

function useOpenSearch(query) {
  const [data, setData] = useState(null);

  const fetchData = async () => {
    await fetch(
      `${process.env.REACT_APP_API_DOMAIN}/search?query=${query}`
    )
      .then((response) => response.json())
      .then((result) => {
        setData(result.data);
      })
      .catch((err) => {
        console.log('error', err);
      });
  };

  useEffect(() => {
    console.log('query: ', query);
    fetchData();
  }, [query]);

  return { data };
}

export default useOpenSearch;
