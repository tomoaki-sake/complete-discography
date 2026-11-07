import type { SpotifyTrack } from "@/types/spotify"
import { normalizeTitle, type SpotifyApi } from "../lib/spotify-api"

// 「曲名 + アーティスト名」から Spotify のトラックを1つ選ぶ。
// 見つからない・自信がないときは null を返し、無理に別の曲を入れない。
//
// 照合の強さ（上ほど優先）
// 1. 完全一致（全角半角・大文字小文字の違いのみ無視）
// 2. 同等: 括弧書き・「- Remastered」などの付記、記号・空白の違いを無視して一致
//    （例: 「チャールズブロンソン」と「チャールズ・ブロンソン」）
//    Acoustic・Remix などの別バージョンを選んだ場合は approximate として報告する
// 3. 近似: 入力が Spotify の曲名の前方（3文字以上）、または大部分に一致する
//    （例: 「ドミノ」と「ドミノのお告げ」、「チャールズブロンソン」と「チャールズ・ブロンソンのために」）
// 4. 略称（アーティストの全曲から探すときだけ）: 入力が曲名に2文字以上含まれる、
//    または文字の順番が合う省略形（例: 「キェルツェ螺旋」と「キェルツェの螺旋」）
//
// 近似・略称は「入力が Spotify の曲名を縮めたもの」の向きだけを認める
// （逆向きだと、未発表曲「夜明けの君に」にカタログの「君に」が入ってしまう）。
// また、アーティストの全曲で「その呼び方ならそれしかありえない」と確かめられたときだけ採用し、
// 同じ段階に曲名の違う候補が2つ以上あるとき（「ドミノのお告げ」と「ドミノ倒し」など）は決めつけない。

export interface SongQuery {
  title: string
  artist: string
}

export interface MatchResult {
  track: SpotifyTrack
  approximate: boolean
}

const LIVE_PATTERN = /\blive\b|ライブ/i
// 元の曲とは別物として扱いたいバージョン
const VARIANT_PATTERN =
  /\b(acoustic|remix|reprise|instrumental|inst|karaoke|demo|unplugged|ver|version)\b|アコースティック|弾き語り|リミックス|インスト|カラオケ|デモ/i
// 近似（段階3）の条件: 入力の文字数と、Spotify の曲名に占める割合
// 前方一致は手がかりとして強いので、部分一致よりゆるくする
const PREFIX_MIN_LENGTH = 3
const PREFIX_MIN_RATIO = 0.3
const CONTAINS_MIN_LENGTH = 4
const CONTAINS_MIN_RATIO = 0.5
// 略称（段階4）の条件: 部分一致は2文字以上、順番が合う省略形は3文字以上
const ABBREV_MIN_LENGTH = 2
const SUBSEQUENCE_MIN_LENGTH = 3
// アーティスト名の部分一致を認める条件（「A」のような短い名前で何にでも当たらないように）
const ARTIST_CONTAINS_MIN_LENGTH = 3
const ARTIST_CONTAINS_MIN_RATIO = 0.5

const length = (s: string) => Array.from(s).length
const stripSymbols = (s: string) => s.replace(/[\s\p{P}\p{S}]/gu, "")

// 括弧書きや「 - 2020 Remaster」などの付記を取り除いた曲名
// （「 - 」の前後の空白と単語の境界を見るので、「Blue - Monologue」や「Re-Live」は削らない）
export const cleanTitle = (s: string) =>
  normalizeTitle(s)
    .replace(
      /\s+[-–—]\s+.*\b(remaster(ed)?|version|ver|mix|edit|live|mono|stereo)\b.*$/i,
      "",
    )
    .replace(/[([（【［][^)\]）】］]*[)\]）】］]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

// 記号・空白をすべて除いた比較用の曲名
export const compactTitle = (s: string) => stripSymbols(cleanTitle(s))

export const sameArtistName = (a: string, b: string) => {
  const x = compactTitle(a)
  const y = compactTitle(b)
  // 記号だけの名前などで比較用の文字列が空になる場合は、元の表記で比べる
  if (!x || !y) return normalizeTitle(a) === normalizeTitle(b)
  if (x === y) return true
  const [short, long] = length(x) <= length(y) ? [x, y] : [y, x]
  return (
    long.includes(short) &&
    length(short) >= ARTIST_CONTAINS_MIN_LENGTH &&
    length(short) / length(long) >= ARTIST_CONTAINS_MIN_RATIO
  )
}

const artistMatches = (track: SpotifyTrack, artist: string) =>
  track.artists.some((a) => sameArtistName(a.name, artist))

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
  const keyLength = length(key)
  const wantLength = length(want)
  // 近似・略称は入力のほうが短い（入力が曲名を縮めたもの）場合だけ
  const inputIsShorter = wantLength > 0 && wantLength < keyLength
  const ratio = inputIsShorter ? wantLength / keyLength : 0

  const requestedVariant =
    LIVE_PATTERN.test(song.title) || VARIANT_PATTERN.test(song.title)
  // 付記を取り除いた結果、ライブ・アコースティックなど別バージョンだったもの
  // （「2020 Remastered Version」のようなリマスター表記は同じ曲として扱う）
  const annotation = track.name.replace(/remaster(ed)?(\s+version)?/gi, "")
  const isVariant =
    !requestedVariant &&
    stripSymbols(normalizeTitle(track.name)) !== key &&
    (LIVE_PATTERN.test(annotation) || VARIANT_PATTERN.test(annotation))

  let tier: number
  if (normalizeTitle(track.name) === normalizeTitle(song.title)) {
    tier = TIER.exact
  } else if (key && key === want) {
    tier = TIER.equivalent
  } else if (
    inputIsShorter &&
    ((key.startsWith(want) &&
      wantLength >= PREFIX_MIN_LENGTH &&
      ratio >= PREFIX_MIN_RATIO) ||
      (key.includes(want) &&
        wantLength >= CONTAINS_MIN_LENGTH &&
        ratio >= CONTAINS_MIN_RATIO))
  ) {
    tier = TIER.approximate
  } else if (
    allowAbbreviation &&
    inputIsShorter &&
    ((key.includes(want) && wantLength >= ABBREV_MIN_LENGTH) ||
      (wantLength >= SUBSEQUENCE_MIN_LENGTH && isSubsequence(want, key)))
  ) {
    tier = TIER.abbreviation
  } else {
    return null
  }

  // 同じ段階の中では、曲名が近いほど高く、
  // 求めていない別バージョン（ライブ・アコースティックなど）は低くする
  const score = (tier >= TIER.equivalent ? 1 : ratio) - (isVariant ? 1 : 0)
  return {
    track,
    // 別バージョンしか見つからずにそれを選んだ場合も、確認してもらう
    approximate: tier <= TIER.approximate || isVariant,
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
  // 同じ曲名の別音源（リマスターなど）は同じ曲として扱う
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

  // アーティストを1人に特定できないときは null。
  // API エラーはそのまま投げる（握りつぶすと「全曲で確かめた」前提が黙って外れるため）
  const getCatalog = (artist: string) => {
    const key = compactTitle(artist)
    let catalog = catalogs.get(key)
    if (!catalog) {
      catalog = (async () => {
        const results = await api.searchArtists(artist)
        const exact = results.items.filter(
          (a) => compactTitle(a.name) === compactTitle(artist),
        )
        if (exact.length !== 1) return null
        return api.collectArtistsTracks([exact[0].id])
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

    // 近似・略称・別バージョンは、アーティストの全曲で紛らわしい曲がないか確かめてから採用する。
    // 全曲が取れない（アーティストを1人に特定できない）ときは採用しない
    const catalog = await getCatalog(song.artist)
    return catalog ? pickBest(catalog, song, true) : null
  }

  return { find }
}
