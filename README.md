# complete-discography

Spotifyで特定のアーティストの全曲プレイリストを作成するアプリケーション

## Develop

```bash
pnpm dev
```
`http://127.0.0.1:3000`で開発サーバーが立ち上がります。
（Spotify は 2025-11 以降 `localhost` を Redirect URI に使えないため、ループバック IP でアクセスしてください）

## MCP サーバー（Claude Code から使う）

Claude Code などの MCP クライアントから「◯◯の全曲プレイリストを作って」と頼めるようにする、ローカル専用の stdio サーバーです。

### 準備

1. Spotify Developer Dashboard の Redirect URIs に `http://127.0.0.1:8888/callback` を追加する
2. Spotify にログインする（トークンは `~/.config/complete-discography/tokens.json` に権限 600 で保存されます）

   ```bash
   pnpm mcp:login
   ```

3. Claude Code に登録する

   ```bash
   claude mcp add complete-discography -- "$(pwd)/node_modules/.bin/tsx" "$(pwd)/src/mcp/stdio.ts"
   ```

ログアウトは `pnpm mcp:logout`（トークンファイルを削除）。Spotify 側の連携解除は https://www.spotify.com/account/apps/ から行えます。

### ツール

- `create_complete_discography_playlist`: アーティスト（複数可）の曲を漏れなく集めてプレイリストを作成します。発売期間（初出の発売日）で絞り込めます。アーティスト名で1人に特定できない場合は候補を返します。
  - 例: 「スピッツの全曲」「AとBの曲を1つのプレイリストに」「◯◯の2000年代の曲」
- `create_playlist_from_songs`: 曲名とアーティスト名のリストから、その順番どおりにプレイリストを作成します。見つからなかった曲は報告します。
  - 例: ライブのセットリスト（テキスト・画像・URL）、会話や気分で選んだ曲
  - 曲名の表記ゆれ（中黒の有無、正式名の一部だけ など）はある程度吸収し、近い曲名で選んだ曲は確認用に報告します。
- `update_playlist`: 作成済みのプレイリストの名前・説明・公開設定を変更したり、曲を入れ替えたりします（作り直しで重複させないため）。

どちらも既定は非公開です。

Spotify Developer Terms に配慮し、Claude に返すのはプレイリスト名・曲数・URL（と、必要な場合のアーティスト候補の名前と ID）だけにしています。
