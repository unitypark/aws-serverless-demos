import axios from "axios";
import { useState, useRef, useEffect, CSSProperties } from "react";
import { SERVER_ENDPOINTS } from "../config";
import "./URLShortenerForm.css";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import StarBorderIcon from '@mui/icons-material/StarBorder';
import CopyToClipboard from "react-copy-to-clipboard";
import toast, { Toaster } from "react-hot-toast";
import PropagateLoader from "react-spinners/PropagateLoader";
import PulseLoader  from "react-spinners/PulseLoader";


function URLShortenerForm() {
  const [destination, setDestination] = useState();
  const divRef = useRef<HTMLAnchorElement>(null);
  const [loading, setloading] = useState(true);
  const [backendLoading, setBackendLoading] = useState(false);
  const [forks, setforks] = useState(0);
  const [stars, setstars] = useState(0);
  const [shortUrlPath, setShortUrlPath] = useState<{
    path: string;
  } | null>(null);
  const [finalUrl, setFinalUrl] = useState<{
    displayUrl: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setShortUrlPath(null);
    setFinalUrl(null);
    setBackendLoading(true);

    const result = await axios
      .post(`${SERVER_ENDPOINTS}/urls`, { url: destination })
      .then((resp) => resp.data)
      .catch((err) => {
        toast.error("Please enter a valid url.");
      });

    setBackendLoading(false);
    setShortUrlPath(result.data);
    setFinalUrl(result.data.url);
  }
  var redirectURL = `${SERVER_ENDPOINTS}/urls/${shortUrlPath?.path}`;
  const text = () => {
    toast.success("Copied!");
  };


  const getForksStarsCount = async () => {
    const { data } = await axios.get(`https://api.github.com/repos/deloittepark/aws-serverless-golang`);
    setforks(data.forks_count);
    setstars(data.stargazers_count);
    setloading(false);
  };
  useEffect(() => {
    getForksStarsCount();
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
              Shorten <span>URLs</span>
            </p>
          </div>
          <div className="forks_stars_div">
            <div className="block_div">
              <a className="btn" href="https://github.com/deloittepark/aws-serverless-golang/tree/main/docker-golang-fiber-url-shortener" rel="noreferrer noopener" target="_blank" aria-label="Fork aditya-singh9/kekfinder on GitHub">
                <div className="block_divLeft">

                  <StarBorderIcon className="starbtn" /><p className="forks_stars_text">Star</p>
                </div>
              </a>
              <div className="black_pipe"> </div>
              <div className="block_divLeftNum">
                <p className="block_divLeftNumText">{stars}</p>
              </div>
            </div>
            <div className="block_div">
              <a className="btn" href="https://github.com/deloittepark/aws-serverless-golang/fork" rel="noreferrer noopener" target="_blank" aria-label="Fork aditya-singh9/kekfinder on GitHub">
                <div className="block_divRight">

                  <svg className="fork_logo" viewBox="0 0 16 16" width="20" height="20" margin-top="2" aria-hidden="true">
                    <path fill-rule="evenodd" d="M5 3.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm0 2.122a2.25 2.25 0 10-1.5 0v.878A2.25 2.25 0 005.75 8.5h1.5v2.128a2.251 2.251 0 101.5 0V8.5h1.5a2.25 2.25 0 002.25-2.25v-.878a2.25 2.25 0 10-1.5 0v.878a.75.75 0 01-.75.75h-4.5A.75.75 0 015 6.25v-.878zm3.75 7.378a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm3-8.75a.75.75 0 100-1.5.75.75 0 000 1.5z">
                    </path>
                  </svg>
                  <p className="fork">Fork</p>

                </div>
              </a>
              <div className="black_pipe"> </div>
              <div className="block_divRightNum">
                <p>{forks}</p>
              </div>
            </div>

          </div>
          <div className="outer">
            <form className="form" onSubmit={handleSubmit}>
              <input
                className="input"
                placeholder="Enter a URL"
                onChange={(e: any) => setDestination(e.target.value)}
              />
              <button type="submit" className="button">
                Create!
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

export default URLShortenerForm;
