import Script from "next/script";

import { GA_INIT_SNIPPET, GA_MEASUREMENT_ID, isAnalyticsEnabled } from "./gaConfig";

/**
 * Google Analytics 4（アクセス解析）。ルートレイアウトの body 内に1つだけ置く。
 *
 * - 本番デプロイ以外では何も描画しない（gaConfig.ts の isAnalyticsEnabled）
 * - 送るのはページビュー（クエリを落としたパス）と GA4 の自動収集イベントだけ。
 *   フォームの入力値やアプリ内のユーザーデータは送らない
 * - イベントを追加するときは、同じ変更でプライバシーポリシーの記載も見直すこと
 */
export function Analytics() {
  if (!isAnalyticsEnabled()) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {GA_INIT_SNIPPET}
      </Script>
    </>
  );
}
