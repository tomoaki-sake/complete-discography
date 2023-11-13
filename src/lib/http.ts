import { url } from "inspector";

type SearchParams = {
  [key: string]: string;
};

type GetArgs = {
  url: string;
  headers?: HeadersInit;
  params?: SearchParams;
  body?: any;
};

export const get = async ({ url, headers, params, body }: GetArgs) => {
  const searchParams = params ? new URLSearchParams(params).toString() : "";
  const urlWithParams = searchParams ? `${url}?${searchParams}` : url;
  return await fetch(urlWithParams, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
};

type PostArgs = {
  url: string;
  headers?: HeadersInit;
  body?: any;
};

export const post = async ({ url, body, headers }: PostArgs) => {
  return await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body,
  });
};
