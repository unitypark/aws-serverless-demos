import axios from "axios";
import { useState, useRef, useEffect, CSSProperties } from "react";
import "./URLShortenerForm.css";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import StarBorderIcon from '@mui/icons-material/StarBorder';
import CopyToClipboard from "react-copy-to-clipboard";
import toast, { Toaster } from "react-hot-toast";
import PropagateLoader from "react-spinners/PropagateLoader";
import PulseLoader  from "react-spinners/PulseLoader";
import { useContext } from "react";
import { AppCtx } from "../index";

function DownloaderForm() {
  const [destination, setDestination] = useState();
  const divRef = useRef<HTMLAnchorElement>(null);
  const [loading, setloading] = useState(true);
  const [backendLoading, setBackendLoading] = useState(false);
  const [accessKey, setAccessKey] = useState("");
  const [shortUrlPath, setShortUrlPath] = useState<{
    path: string;
  } | null>(null);
  const [finalUrl, setFinalUrl] = useState<{
    displayUrl: string;
  } | null>(null);
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
    setShortUrlPath(null);
    setFinalUrl(null);
    setBackendLoading(true);

    const apiClient = axios.create({
      baseURL: appContext?.apiEndpoint,
    });

    const result = await apiClient
      .get(`downloads/${accessKey}`)
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
      link.setAttribute('download', result.data.filename); //or any other extension
      document.body.appendChild(link);
      link.click();
  
      // clean up "a" element & remove ObjectURL
      document.body.removeChild(link);
      URL.revokeObjectURL(href);
    })
    .catch((err) => {
      toast.error("download failed");
    })
    setBackendLoading(false);
  }
  var redirectURL = `${appContext?.apiEndpoint}urls/${shortUrlPath?.path}`;
  const text = () => {
    toast.success("Copied!");
  };

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
                  onChange={(e: any) => setDestination(e.target.value)}
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

          {shortUrlPath && (
            <div className="link-div">
              <p className="link">
                <span>
                  <a
                    href={`${redirectURL}`}
                    target="_blank"
                    rel="noreferrer"
                    ref={divRef}
                  >
                    {finalUrl}
                  </a>
                </span>
              </p>
              <CopyToClipboard text={redirectURL}>
                <ContentCopyRoundedIcon className="copyBtn" onClick={text} />
              </CopyToClipboard>
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

export default DownloaderForm;
