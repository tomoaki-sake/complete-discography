import "./App.css";
import { ChakraProvider } from "@chakra-ui/react";
import { AppRoutes } from "./routes";

export const App = () => {
  return (
    <ChakraProvider>
      <AppRoutes />
    </ChakraProvider>
  );
};
