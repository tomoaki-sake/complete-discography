import { storage } from "@/utils/storage";
import { get } from "./http";

export const getSpotifyProfile = async () => {
  const accessToken = storage.getAccessToken();
  const headers = {
    Authorization: `Bearer ${accessToken}`,
  };
  const response = await get({
    url: "https://api.spotify.com/v1/me",
    headers,
  });
  const responseJson = await response.json();
  return responseJson;
};

export const searchArtists = async (query: string) => {
  const accessToken = storage.getAccessToken();
  const headers = {
    Authorization: `Bearer ${accessToken}`,
  };
  const response = await get({
    url: "https://api.spotify.com/v1/search",
    headers,
    params: {
      q: query,
      type: "artist",
    },
  });
  const responseJson = await response.json();
  return responseJson;
};
