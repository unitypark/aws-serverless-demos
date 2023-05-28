import axios from "axios";
import { useState, useRef, useEffect, CSSProperties } from "react";
import "./Form.css";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import StarBorderIcon from '@mui/icons-material/StarBorder';
import CopyToClipboard from "react-copy-to-clipboard";
import toast, { Toaster } from "react-hot-toast";
import PropagateLoader from "react-spinners/PropagateLoader";
import PulseLoader from "react-spinners/PulseLoader";
import { useContext } from "react";
import { AppCtx } from "../App";
import { DropzoneDialog } from 'material-ui-dropzone';
import { useHistory } from "react-router-dom";

function AdminForm() {
  const divRef = useRef<HTMLAnchorElement>(null);
  const [fileName, setFileName] = useState("");
  const [loading, setloading] = useState(true);
  const [backendLoading, setBackendLoading] = useState(false);
  const [forks, setforks] = useState(0);
  const [stars, setstars] = useState(0);
  const [openDropZone, setOpenDropZone] = useState(false);
  const [response, setResponse] = useState<{ username: string, role: string, accessKey: string } | null>(null);
  const appContext = useContext(AppCtx);
  const history = useHistory();

  const apiClient = axios.create({
    baseURL: appContext?.origin,
    withCredentials: true,
  });

  async function handleSubmit(files: File[]) {
    setResponse(null);
    setBackendLoading(true);

    let unixTimestampInSeconds = Math.floor(Date.now() / 1000)
    let path = `${appContext.username}/${unixTimestampInSeconds}/${files[0].name}`.replace(/\s/g, "").toLowerCase();

    const postUploadsRes = await apiClient.post(`/api/uploads`, { username: appContext.username, path: path })
    // PUT request: upload file to S3
    const result = await fetch(postUploadsRes.data.data.url, {
      method: "PUT",
      body: files[0],
    });

    setFileName(files[0].name);
    if (result.status === 200) {
      await apiClient
        .post(`/api/downloads`, { username: appContext.username, path: path })
        .then((resp) => resp.data)
        .then((res) => {
          setResponse(res.data);
          toast.success("Download URL is ready!");
        })
        .catch((err) => {
          toast.error("Something went wrong");
        });
    } else {
      toast.error("Upload failed");
    }
    setBackendLoading(false);
  }
  var redirectURL = `${appContext?.origin}/downloader?key=${response?.accessKey}`;
  const text = () => {
    toast.success("Copied!");
  };

  const handleOnClick = () => {
    setOpenDropZone(true);
  }

  const getForksStarsCount = async () => {
    const { data } = await axios.get(`https://api.github.com/repos/unitypark/aws-serverless-demos`);
    setforks(data.forks_count);
    setstars(data.stargazers_count);
  };

  const fetchConfig = async () => {
    const res = await apiClient.get(`/api/config`);

    if (res.status === 200) {
      const user = res.data.data.user;
      // setting current user information
      appContext.username = user.username;
      appContext.isAdmin = user.isAdmin;
      if (user.isAdmin === true) {
        setloading(false);
      } else {
        history.push({
          pathname: '/downloader',
          search: '?key=',
        });
      }
    } else {
      toast.error("Something went wrong while configuration!");
    }
  }

  useEffect(() => {
    getForksStarsCount();
    fetchConfig();
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
              AWS 🌩️ S3 <span>FileShare</span>
            </p>
          </div>
          <div className="forks_stars_div">
            <div className="block_div">
              <a className="btn" href="https://github.com/unitypark/aws-serverless-demos" rel="noreferrer noopener" target="_blank" aria-label="Fork aditya-singh9/kekfinder on GitHub">
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
              <a className="btn" href="https://github.com/unitypark/aws-serverless-demos/fork" rel="noreferrer noopener" target="_blank" aria-label="Fork aditya-singh9/kekfinder on GitHub">
                <div className="block_divRight">

                  <svg className="fork_logo" viewBox="0 0 16 16" width="20" height="20" margin-top="2" aria-hidden="true">
                    <path fillRule="evenodd" d="M5 3.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm0 2.122a2.25 2.25 0 10-1.5 0v.878A2.25 2.25 0 005.75 8.5h1.5v2.128a2.251 2.251 0 101.5 0V8.5h1.5a2.25 2.25 0 002.25-2.25v-.878a2.25 2.25 0 10-1.5 0v.878a.75.75 0 01-.75.75h-4.5A.75.75 0 015 6.25v-.878zm3.75 7.378a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm3-8.75a.75.75 0 100-1.5.75.75 0 000 1.5z">
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
          <DropzoneDialog
            filesLimit={1}
            dialogTitle={"Select single file to upload"}
            cancelButtonText={"cancel"}
            submitButtonText={"submit"}
            maxFileSize={2e+9}
            fullWidth={true}
            open={openDropZone}
            onClose={() => setOpenDropZone(false)}
            onSave={(files) => {
              handleSubmit(files)
              setOpenDropZone(false);
            }}
            showPreviews={true}
            showPreviewsInDropzone={false}
            useChipsForPreview
          />
          <button type="submit" className="selectButton" onClick={handleOnClick}>
            Select
          </button>
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

          {response && (
            <div className="link-div">
              <p className="link">
                <span>
                  <a
                    href={`${redirectURL}`}
                    target="_blank"
                    rel="noreferrer"
                    ref={divRef}
                  >
                    {response.accessKey}
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

export default AdminForm;
