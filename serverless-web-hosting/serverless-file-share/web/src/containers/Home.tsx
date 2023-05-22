import { Box } from "@chakra-ui/react";
import AdminForm from "../components/HomeForm";

function Home() {
  return (
    <Box
      height="100%"
      display="flex"
      alignItems="center"
      justifyContent="center"
      backgroundColor="white"
    >
      <AdminForm />
    </Box>
  );
}

export default Home;
