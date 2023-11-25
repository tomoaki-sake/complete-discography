import { RouteObject } from "react-router-dom";
import { Login } from "./Login";

export const AuthRoutes: RouteObject[] = [
  {
    path: "login",
    element: <Login />,
  },
];
