import axios from "axios";
import { useState, useEffect, CSSProperties } from "react";
import "./Form.css";
import toast, { Toaster } from "react-hot-toast";
import PropagateLoader from "react-spinners/PropagateLoader";
import PulseLoader from "react-spinners/PulseLoader";
import { useContext } from "react";
import { AppCtx } from "../App";

function DownloaderForm() {
  const [downloadKey, setDownloadKey] = useState("");
  const [loading, setloading] = useState(true);
  const [backendLoading, setBackendLoading] = useState(false);
  const appContext = useContext(AppCtx);

  const apiClient = axios.create({
    baseURL: appContext?.origin,
    withCredentials: true,
  });

  const fetchConfig = async () => {
    // get the data from the api
    const res = await apiClient.get(`/api/config`);

    if (res.status === 200) {
      const user = res.data.data.user;
      // setting current user information
      appContext.username = user.username;
      appContext.isAdmin = user.isAdmin;
      setloading(false);
    } else {
      toast.error("Something went wrong while configuration!");
    }
  }

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search)
    const key = queryParams.get("key")
    if (key != null) {
      setDownloadKey(key);
      fetchConfig();
    } else {
      toast.error("Access Key is missing!");
    }
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBackendLoading(true);
    await apiClient
      .get(`/api/downloads/${downloadKey}?id=${appContext.username}`)
      .then((resp) => resp.data)
      .then((res) => {
        axios({
          method: "GET",
          url: res.data.url,
          responseType: 'blob',
        })
          .then(blob => {
            toast.success("File will be downloaded!");
            const href = URL.createObjectURL(blob.data);
            const link = document.createElement('a');
            link.href = href;
            link.setAttribute('download', res.data.filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(href);
          })
          .catch((err) => {
            toast.error("Download failed");
          })
      })
      .catch((err) => {
        toast.error("Access Key is not valid!");
      });
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
              Provide Your <span>Download Key</span>
            </p>
          </div>
          <div className="outer">
            <form className="form" onSubmit={handleSubmit}>
              <div>
                <input
                  className="input"
                  value={downloadKey}
                  required={true}
                  onChange={(e: any) => setDownloadKey(e.target.value)}
                />
              </div>
              <button type="submit" className="button">
                download
              </button>
            </form>
          </div>
          {
            backendLoading && (
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
