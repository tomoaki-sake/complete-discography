const storagePrefix = "complete-discography-";

export const storage = {
  getCodeVerifier: () => {
    const codeVerifier = window
      ? window.localStorage.getItem(`${storagePrefix}code-verifier`)
      : null;
    return codeVerifier;
  },
  setCodeVerifier: (codeVerifier: string) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(`${storagePrefix}code-verifier`, codeVerifier);
  },
  deleteCodeVerifier: () => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(`${storagePrefix}code-verifier`);
  },
  getAccessToken: () => {
    const accessToken = window
      ? window.localStorage.getItem(`${storagePrefix}access-token`)
      : null;
    return accessToken;
  },
  setAccessToken: (accessToken: string) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(`${storagePrefix}access-token`, accessToken);
  },
  deleteAccessToken: () => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(`${storagePrefix}access-token`);
  },
};
