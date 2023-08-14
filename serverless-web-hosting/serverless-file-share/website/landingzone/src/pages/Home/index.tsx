import { lazy } from "react";
import IntroContent from "../../content/IntroContent.json";
import CloudformationBlockContent from "../../content/CloudformationBlockContent.json";
import SystemEngineeringBlockContent from "../../content/SystemEngineeringBlockContent.json";
import AboutContent from "../../content/AboutContent.json";
import DeployContent from "../../content/DeployContent.json";
import ArchBlockContent from "../../content/ArchBlockContent.json";


const MiddleBlock = lazy(() => import("../../components/MiddleBlock"));
const Container = lazy(() => import("../../common/Container"));
const ScrollToTop = lazy(() => import("../../common/ScrollToTop"));
const ContentBlock = lazy(() => import("../../components/ContentBlock"));
const Home = () => {
  return (
    <Container>
      <ScrollToTop />
      <ContentBlock
        type="right"
        title={IntroContent.title}
        content={IntroContent.text}
        button={IntroContent.button}
        icon="rocket.gif"
        id="ctse"
      />
      <MiddleBlock
        title={CloudformationBlockContent.title}
        content={CloudformationBlockContent.text}
        id="ct"
      />
      <MiddleBlock
        title={SystemEngineeringBlockContent.title}
        content={SystemEngineeringBlockContent.text}
        id="se"
      />
      <ContentBlock
        type="left"
        title={AboutContent.title}
        content={AboutContent.text}
        section={AboutContent.section}
        icon="fileshare.jpg"
        id="service"
      />
      <ContentBlock
        type="right"
        title={ArchBlockContent.title}
        content={ArchBlockContent.text}
        icon="arch.png"
        id="arch"
      />
      <ContentBlock
        type="left"
        title={DeployContent.title}
        content={DeployContent.text}
        icon="deploy.jpg"
        id="how-to"
      />
    </Container>
  );
};

export default Home;
