import { storage } from "@/utils/storage";
import {
  generateCodeChallenge,
  generateCodeVerifier,
} from "./codechallenge-generator";
import { get, post } from "./http";

const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!;
const redirectUri = process.env.NEXT_PUBLIC_APP_DOMAIN!;

const scope = "user-read-private user-read-email";
const authUrl = new URL("https://accounts.spotify.com/authorize");
const tokenUrl = new URL("https://accounts.spotify.com/api/token");

export const requestUserAuthorization = async () => {
  const codeVerifier = generateCodeVerifier();
  storage.setCodeVerifier(codeVerifier);
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const params = {
    response_type: "code",
    client_id: clientId,
    scope,
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
    redirect_uri: redirectUri,
  };

  authUrl.search = new URLSearchParams(params).toString();
  window.location.href = authUrl.toString();
};

export const getRedirectParams = () => {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const state = params.get("state");
  const error = params.get("error");

  return { code, state, error };
};

export const getTokens = async (code: string) => {
  if (!!storage.getAccessToken()) return;

  const codeVerifier = storage.getCodeVerifier();

  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  const payload = new URLSearchParams({
    client_id: clientId,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier ?? "",
  });

  const response = await post({
    url: tokenUrl.toString(),
    body: payload,
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description);
  }
  const responseJson = await response.json();

  const accessToken = responseJson.access_token;

  storage.setAccessToken(accessToken);
};

export const logout = () => {
  storage.deleteCodeVerifier();
  storage.deleteAccessToken();
};
