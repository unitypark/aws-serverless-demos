import { Box } from "@chakra-ui/react";
import DownloaderForm from "../components/DownloaderForm";

function Downloader() {
  return (
    <Box
      height="100%"
      display="flex"
      alignItems="center"
      justifyContent="center"
      backgroundColor="white"
    >
      <DownloaderForm />
    </Box>
  );
}

export default Downloader;
