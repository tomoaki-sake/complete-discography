import { TOKEN_FILE } from "./config"
import { deleteTokens } from "./token-store"

// `pnpm mcp:logout`
// 保存したトークンを削除する。
// Spotify 側の連携も解除する場合は https://www.spotify.com/account/apps/ から行う。

deleteTokens()
  .then(() => {
    console.log(`トークンを削除しました: ${TOKEN_FILE}`)
    console.log(
      "Spotify 側のアプリ連携も解除する場合は https://www.spotify.com/account/apps/ から行ってください。",
    )
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
