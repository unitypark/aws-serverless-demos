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
import { DropzoneDialog } from "material-ui-dropzone";
import { Alert, AlertTitle } from "@mui/material";

function UploaderForm() {
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

    const result = await axios
      .post(`${appContext?.apiEndpoint}urls`, { url: destination })
      .then((resp) => resp.data)
      .catch((err) => {
        toast.error("Please enter a valid url.");
      });

    setBackendLoading(false);
    setShortUrlPath(result.data);
    setFinalUrl(result.data.url);
  }

  const [files, setFiles] = useState([]);
 
  const handleDelete = (deleted: any) => {
      setFiles(files.filter((f) => f !== deleted));
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
        <DropzoneDialog
        open={true}
        showPreviews={true}
        showPreviewsInDropzone={false}
        useChipsForPreview
        filesLimit={1}
        onDelete={handleDelete}
      />
    );
  } else {
    return ( 
       <PropagateLoader color="#0070f3" loading={loading} cssOverride={override} size={15} />
    );
  }
}

export default UploaderForm;
