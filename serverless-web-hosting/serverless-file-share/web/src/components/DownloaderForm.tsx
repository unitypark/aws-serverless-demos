import axios from "axios";
import { useState, useRef, useEffect, CSSProperties } from "react";
import "./Form.css";
import toast, { Toaster } from "react-hot-toast";
import PropagateLoader from "react-spinners/PropagateLoader";
import PulseLoader  from "react-spinners/PulseLoader";
import { useContext } from "react";
import { AppCtx } from "../index";

function DownloaderForm() {
  const [accessKey, setAccessKey] = useState("");
  const [loading, setloading] = useState(true);
  const [backendLoading, setBackendLoading] = useState(false);
  const appContext = useContext(AppCtx);

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search)
    const key = queryParams.get("key")
    if (key != null) {
      setloading(false);
      setAccessKey(key);
    }
  }, [])
  
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBackendLoading(true);

    const apiClient = axios.create({
      baseURL: appContext?.origin,
    });

    const result = await apiClient
      .get(`/api/downloads/${accessKey}`)
      .then((resp) => resp.data)
      .catch((err) => {
        toast.error("access key is not valid");
      });
    
    axios({
      method: "GET",
      url: result.data.url,
      responseType: 'blob',
    })
    .then(res => { 
      const href = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = href;
      link.setAttribute('download', result.data.filename);
      document.body.appendChild(link);
      link.click();
  
      document.body.removeChild(link);
      URL.revokeObjectURL(href);
    })
    .catch((err) => {
      toast.error("download failed");
    })
    setBackendLoading(false);
  }

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
              Provide Your <span>Access Key</span>
            </p>
          </div>
          <div className="outer">
            <form className="form" onSubmit={handleSubmit}>
              <div>
                <input
                  className="input"
                  value={accessKey}
                  onChange={(e: any) => setAccessKey(e.target.value)}
                />
              </div>
              <button type="submit" className="button">
                download
              </button>
            </form>
          </div>
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

export default DownloaderForm;
