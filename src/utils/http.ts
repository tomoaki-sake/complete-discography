interface PostArgs {
  url: string
  headers?: HeadersInit
  body?: any
}

export const post = async ({ url, body, headers }: PostArgs) => {
  return await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body,
  })
}
