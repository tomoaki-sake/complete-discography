"use client";

import { H1 } from "@/components/elements/Heading";
import { ListItem, SelectableList } from "@/components/elements/SelectableList";
import { getRedirectParams, getTokens, logout } from "@/lib/spotify-auth";
import { getSpotifyProfile, searchArtists } from "@/lib/spotify-requests";
import { storage } from "@/utils/storage";
import { useEffect, useState } from "react";

export default function CompleteDiscography() {
  const [userName, setUserName] = useState<string | null>("");
  const [artistName, setArtistName] = useState<string | null>("");
  const [artistList, setArtistList] = useState<ListItem[]>([]);
  const [selectedArtist, setSelectedArtist] = useState<ListItem | null>(null);
  const { code, state, error } = getRedirectParams();
  useEffect(() => {
    if (!code || !!storage.getAccessToken()) return;
    const setProfile = async () => {
      await getTokens(code);
      const profile = await getSpotifyProfile();
      setUserName(profile.display_name);
    };
    setProfile();
  }, [code]);

  const handleSearchArtists = async () => {
    if (!artistName) return;
    const res = await searchArtists(artistName);
    const artists = res.artists.items.map((artist: any) => {
      return { id: artist.id, content: artist.name };
    });
    setArtistList(artists);
  };

  return (
    <div className="min-h-screen">
      <div className="flex flex-col items-center justify-center py-2">
        <H1>Complete Discography</H1>
        <p className="text-2xl font-bold mt-3">Welcome {userName}</p>
      </div>
      <div className="flex justify-center">
        <input
          type="text"
          placeholder="Artist Name"
          className="border border-gray-300 rounded-md p-2"
          onChange={(e) => setArtistName(e.target.value)}
        />
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 ml-2 rounded"
          onClick={handleSearchArtists}
        >
          Search
        </button>
      </div>
      {artistList && (
        <SelectableList
          items={artistList}
          selectedItem={selectedArtist}
          handleItemClick={setSelectedArtist}
          className="mt-4"
        />
      )}
      <button
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        onClick={logout}
      >
        Logout
      </button>
    </div>
  );
}
