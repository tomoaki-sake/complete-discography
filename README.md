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

- `create_complete_discography_playlist`: アーティストの全曲プレイリストを作成します（既定は非公開）。アーティスト名で1人に特定できない場合は候補を返します。

Spotify Developer Terms に配慮し、Claude に返すのはプレイリスト名・曲数・URL（と、必要な場合のアーティスト候補の名前と ID）だけにしています。
