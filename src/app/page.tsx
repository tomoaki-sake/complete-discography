"use client";
import { Description } from "@/components/elements/Description";
import { H1 } from "@/components/elements/Heading";
import { requestUserAuthorization } from "@/lib/spotify-auth";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex"></div>

      <div className="flex flex-col items-center justify-center w-full text-center">
        <H1>Complete Discography</H1>
        <Description className="mt-3">
          You can make a complete discography of your favorite artist.
        </Description>
      </div>

      <div className="mb-32 flex justify-center text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-4 lg:text-left">
        <button
          className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
          onClick={requestUserAuthorization}
        >
          <h2 className={`mb-3 text-2xl font-semibold`}>
            Login{" "}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              -&gt;
            </span>
          </h2>
          <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>
            Login with Spotify to get started.
          </p>
        </button>
      </div>
    </main>
  );
}
