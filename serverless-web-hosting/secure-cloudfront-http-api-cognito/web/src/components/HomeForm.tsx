import axios from "axios";
import { useState, useEffect, CSSProperties } from "react";
import "./Form.css";
import toast, { Toaster } from "react-hot-toast";
import PropagateLoader from "react-spinners/PropagateLoader";
import PulseLoader  from "react-spinners/PulseLoader";
import { useContext } from "react";
import { AppCtx } from "../App";
import DropdownList from "react-widgets/DropdownList";
import "react-widgets/styles.css";

function HomeForm() {
  const [loading, setloading] = useState(true);
  const [backendLoading, setBackendLoading] = useState(false);
  const [response, setResponse] = useState<{longitude: string, latitude: string, speed: string, message: string} | null>(null);
  const [value, setValue] = useState('0, 0')
  const appContext = useContext(AppCtx);

  const apiClient = axios.create({
    baseURL: appContext?.origin,
    withCredentials: true,
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResponse(null);
    setBackendLoading(true);
    let coordinates = value.replace(/^\((.+)\)$/,"$1").replace(/\s/g, '').split(',');

    await apiClient
      .get(`/api/stations/fastest?latitude=${coordinates[0]}&longitude=${coordinates[1]}`)
      .then((resp) => resp.data)
      .then((res) => {
        setResponse(res.network);
        toast.success("Your Result is ready!");
      })
      .catch((err) => {
        toast.error("Something went wrong");
      });
    setBackendLoading(false);
  }

  useEffect(() => {
    setloading(false);
  }, [])

  const override: CSSProperties = {
    display: "block",
    justifyContent: "center",
    alignItems: "center",
    margin: "0 auto",
    borderColor: "red",
  };

  if (!loading) {

    return (
      <>
        <div className="outer">
          <div>
            <Toaster />
          </div>
          <div className="head-div">
            <p className="head">
            Fastest Cloud ☁️ <span> Network Station</span>
            </p>
          </div>
                   
          <form className="form" onSubmit={handleSubmit}>
            <div>
              <DropdownList
                busy={backendLoading}
                disabled={backendLoading}
                placeholder="Select your device location in coordinates"
                data={["(0, 0)", "(100, 100)", "(15, 10)", "(18, 18)", "(13, 13)", "(25, 99)"]}
                renderValue={({ item }) => (
                  <span>
                    <strong>Device location:</strong>{' ' + item}
                  </span>
                )}
                onChange={value => setValue(value)}
              />
              <button type="submit" className="button">
                search!
              </button>
            </div>
          </form>

          {
            backendLoading &&  (
              <PulseLoader color="#0070f3" cssOverride={{
                margin: "32px 0",
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }} />
            )
          }

          {response && response.speed && (
            <div className="link-div">
                <span>
                  <a>
                  {response.message}
                  </a>
                </span>
            </div>
          )}
          {response && !!!response.speed && (
            <div className="link-div">
                <span className="notfound">
                  <a>
                    {response.message}
                  </a>
                </span>
            </div>
          )}
          <div className="name-div">
            <p className="name">
              Connect with Me on
              <a
                href="https://www.linkedin.com/in/junghwa-park-279129235/"
                target="_blank"
                rel="noreferrer"
              >
                <span> LinkedIn</span>.
              </a>
            </p>
          </div>
        </div>
      </>
    );
  } else {
    return ( 
       <PropagateLoader color="#0070f3" loading={loading} cssOverride={override} size={15} />
    );
  }
}

export default HomeForm;
