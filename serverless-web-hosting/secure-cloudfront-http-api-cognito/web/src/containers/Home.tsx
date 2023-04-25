import { Box } from "@chakra-ui/react";
import HomeForm from "../components/HomeForm";

function Home() {
  return (
    <Box
      height="100%"
      display="flex"
      alignItems="center"
      justifyContent="center"
      backgroundColor="white"
    >
      <HomeForm />
    </Box>
  );
}

export default Home;
