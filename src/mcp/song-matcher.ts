import type { SpotifyTrack } from "@/types/spotify"
import { normalizeTitle, type SpotifyApi } from "../lib/spotify-api"

// 「曲名 + アーティスト名」から Spotify のトラックを1つ選ぶ。
// 見つからない・自信がないときは null を返し、無理に別の曲を入れない。
//
// 照合の強さ（上ほど優先）
// 1. 完全一致（全角半角・大文字小文字の違いのみ無視）
// 2. 同等: 括弧書き・「- Remastered」などの付記、記号・空白の違いを無視して一致
//    （例: 「チャールズブロンソン」と「チャールズ・ブロンソン」）
// 3. 近似: 前方一致（3文字以上）、または曲名の大部分を含む部分一致
//    （例: 「ドミノ」と「ドミノのお告げ」、「チャールズブロンソン」と「チャールズ・ブロンソンのために」）
// 4. 略称（アーティストの全曲から探すときだけ）: 2文字以上の前方一致・部分一致、
//    または文字の順番が合う省略形（例: 「キェルツェ螺旋」と「キェルツェの螺旋」）
//
// 近似・略称で選んだ曲は approximate: true にして、ユーザーに確認してもらう。
// 「そのアーティストでその呼び方なら、それしかありえない」場合だけ採用するため、
// 同じ段階に曲名の違う候補が2つ以上あるとき（「ドミノのお告げ」と「ドミノ倒し」など）は決めつけない。

export interface SongQuery {
  title: string
  artist: string
}

export interface MatchResult {
  track: SpotifyTrack
  approximate: boolean
}

const LIVE_PATTERN = /\blive\b|ライブ|live ver/i
// 近似（段階3）の条件: 短いほうの文字数と、長いほうに占める割合
// 前方一致は手がかりとして強いので、部分一致よりゆるくする
const PREFIX_MIN_LENGTH = 3
const PREFIX_MIN_RATIO = 0.3
const CONTAINS_MIN_LENGTH = 4
const CONTAINS_MIN_RATIO = 0.5
// 略称（段階4）の条件: 前方・部分一致は2文字以上、順番が合う省略形は3文字以上
const ABBREV_MIN_LENGTH = 2
const SUBSEQUENCE_MIN_LENGTH = 3

// 括弧書きや「- Remastered」などの付記を取り除いた曲名
export const cleanTitle = (s: string) =>
  normalizeTitle(s)
    .replace(
      /\s*[-–—]\s*.*(remaster|version|ver\.|mix|edit|live|mono|stereo).*$/i,
      "",
    )
    .replace(/[([（【［][^)\]）】］]*[)\]）】］]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

// 記号・空白をすべて除いた比較用の曲名
export const compactTitle = (s: string) =>
  cleanTitle(s).replace(/[\s\p{P}\p{S}]/gu, "")

const artistMatches = (track: SpotifyTrack, artist: string) => {
  const want = compactTitle(artist)
  return track.artists.some((a) => {
    const name = compactTitle(a.name)
    // 記号だけの名前などで比較用の文字列が空になる場合は、元の表記で比べる
    if (!want || !name) return normalizeTitle(a.name) === normalizeTitle(artist)
    return name === want || name.includes(want) || want.includes(name)
  })
}

// フィールド指定検索の構文を壊す文字を除く
const sanitize = (s: string) => s.replace(/["':]/g, " ").trim()

const TIER = { exact: 4, equivalent: 3, approximate: 2, abbreviation: 1 }

interface Scored extends MatchResult {
  tier: number
  score: number
  key: string
}

// short の文字が long の中に同じ順番で現れるか（略称の判定）
const isSubsequence = (short: string, long: string) => {
  const chars = Array.from(short)
  let i = 0
  for (const ch of long) {
    if (ch === chars[i]) i++
    if (i === chars.length) return true
  }
  return chars.length === 0
}

const scoreTrack = (
  track: SpotifyTrack,
  song: SongQuery,
  allowAbbreviation: boolean,
): Scored | null => {
  const key = compactTitle(track.name)
  const want = compactTitle(song.title)
  const keyLength = Array.from(key).length
  const wantLength = Array.from(want).length
  const [short, long] = keyLength <= wantLength ? [key, want] : [want, key]
  const shortLength = Math.min(keyLength, wantLength)
  const ratio = shortLength / Math.max(keyLength, wantLength, 1)

  let tier: number
  if (normalizeTitle(track.name) === normalizeTitle(song.title)) {
    tier = TIER.exact
  } else if (key && key === want) {
    tier = TIER.equivalent
  } else if (
    (long.startsWith(short) &&
      shortLength >= PREFIX_MIN_LENGTH &&
      ratio >= PREFIX_MIN_RATIO) ||
    (long.includes(short) &&
      shortLength >= CONTAINS_MIN_LENGTH &&
      ratio >= CONTAINS_MIN_RATIO)
  ) {
    tier = TIER.approximate
  } else if (
    allowAbbreviation &&
    ((long.includes(short) && shortLength >= ABBREV_MIN_LENGTH) ||
      // 省略形は入力（want）のほうが短い場合だけ
      (wantLength >= SUBSEQUENCE_MIN_LENGTH &&
        wantLength < keyLength &&
        isSubsequence(want, key)))
  ) {
    tier = TIER.abbreviation
  } else {
    return null
  }

  // 同じ段階の中では、曲名が近いほど高く、
  // ライブ版を求めていないのにライブ音源が出てきたら低くする
  let score = ratio
  if (!LIVE_PATTERN.test(song.title) && LIVE_PATTERN.test(track.name)) {
    score -= 1
  }
  return {
    track,
    approximate: tier <= TIER.approximate,
    tier,
    score,
    key,
  }
}

const pickBest = (
  tracks: SpotifyTrack[],
  song: SongQuery,
  allowAbbreviation = false,
): MatchResult | null => {
  const scored = tracks
    .filter((t) => artistMatches(t, song.artist))
    .map((t) => scoreTrack(t, song, allowAbbreviation))
    .filter((x): x is Scored => x !== null)
    .sort((a, b) => b.tier - a.tier || b.score - a.score)

  const [best] = scored
  if (!best) return null
  // 近似・略称で選ぶときは、同じ段階に曲名の違う候補があれば決めつけない。
  // 同じ曲名の別音源（リマスター・ライブなど）は同じ曲として扱う
  if (
    best.approximate &&
    scored.some((s) => s.tier === best.tier && s.key !== best.key)
  ) {
    return null
  }
  return { track: best.track, approximate: best.approximate }
}

// 1回のツール呼び出しの中で使う。アーティストの全曲カタログはキャッシュする
export const createSongMatcher = (api: SpotifyApi) => {
  const catalogs = new Map<string, Promise<SpotifyTrack[] | null>>()

  const getCatalog = (artist: string) => {
    const key = normalizeTitle(artist)
    let catalog = catalogs.get(key)
    if (!catalog) {
      catalog = (async () => {
        try {
          const results = await api.searchArtists(artist)
          const exact = results.items.filter(
            (a) => compactTitle(a.name) === compactTitle(artist),
          )
          if (exact.length !== 1) return null
          return await api.collectArtistsTracks([exact[0].id])
        } catch {
          return null
        }
      })()
      catalogs.set(key, catalog)
    }
    return catalog
  }

  const find = async (song: SongQuery): Promise<MatchResult | null> => {
    const title = sanitize(song.title)
    const artist = sanitize(song.artist)

    const strict = pickBest(
      await api.searchTracks(`track:${title} artist:${artist}`),
      song,
    )
    if (strict && !strict.approximate) return strict

    // フィールド指定だと表記ゆれで外れることがあるので、普通の検索でもう一度探す
    const loose = pickBest(await api.searchTracks(`${title} ${artist}`), song)
    if (loose && !loose.approximate) return loose

    // 検索で見つからないときは、そのアーティストの全曲から探す。
    // 全曲が取れたときは、紛らわしい曲がないかも全曲で判定できるので、その結果を採用する
    // （検索結果の上位10件だけで近似を決めると、別の候補を見落とすことがある）
    const catalog = await getCatalog(song.artist)
    if (catalog) return pickBest(catalog, song, true)

    return strict ?? loose
  }

  return { find }
}
