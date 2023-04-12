import { Box } from "@chakra-ui/react";
import UploaderForm from "../components/UploaderForm";

function Uploader() {
  return (
    <Box
      height="100%"
      display="flex"
      alignItems="center"
      justifyContent="center"
      backgroundColor="white"
    >
      <UploaderForm />
    </Box>
  );
}

export default Uploader;
