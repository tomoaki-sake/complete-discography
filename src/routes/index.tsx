import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { AuthRoutes } from "../features/auth/routes";
import { NotFound } from "../features/misc/routes";

export const AppRoutes = () => {
  const commonPaths = [
    {
      path: "*",
      element: <NotFound />,
    },
  ];
  const router = createBrowserRouter([...commonPaths, ...AuthRoutes]);

  return <RouterProvider router={router} />;
};
