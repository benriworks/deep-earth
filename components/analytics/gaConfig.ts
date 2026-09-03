/**
 * Google Analytics 4 の設定（BenriWorks 全サイト共通）。
 *
 * - 測定IDは HTML に出力される**公開値**であり、秘密情報ではないため定数で持つ。
 *   環境変数にすると Vercel 側の設定漏れで計測が止まるため、あえてコードへ置く
 * - データストリームは「BenriWorks（全サイト）」の1本。benriwork.jp と全サブドメインが
 *   同じ測定IDを共有し、アプリ別の数字は GA4 の「ホスト名」ディメンションで分割して見る
 * - 経緯と運用手順は topsite リポジトリの docs/GA4_SETUP_2026-09-02.md
 */
export const GA_MEASUREMENT_ID = "G-5DVSTF5NNS";

/** 計測を有効にする本番ドメイン */
export const GA_HOST = "benriwork.jp";

/**
 * 本番デプロイのときだけ計測する。
 * ローカル開発と Vercel の Preview デプロイでは VERCEL_ENV が "production" にならないため、
 * タグそのものを描画しない。
 */
export function isAnalyticsEnabled(): boolean {
  return process.env.VERCEL_ENV === "production";
}

/**
 * 送信するページURL。クエリとハッシュを落としたパスだけにする。
 * クエリ文字列には検索語や決済のセッションIDが入りうるため、解析サービスへ渡さない。
 * 末尾スラッシュはルート以外で取り除き、同じ画面が別ページとして集計されないようにする。
 */
export function analyticsPageLocation(origin: string, pathname: string): string {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return `${origin}${path === "" ? "/" : path}`;
}

/**
 * gtag の初期化スニペット。
 *
 * ホスト名を判定する理由: 本番デプロイには `*.vercel.app` の固定URLからもアクセスできるため、
 * 本番ドメイン以外からのアクセスを計測に混ぜないよう、config の呼び出しを止める。
 *
 * page_location を固定する理由: クエリ文字列に検索語や決済のセッションIDが入りうるため、
 * 最初のページビューと、gtag が自動送信するイベント（session_start など）から
 * クエリを落とす。
 *
 * SPA の画面遷移は GA4 の拡張計測機能「ページビュー（ブラウザの履歴イベントに基づく）」が
 * 拾う。App Router のクライアント遷移も history API を通るため、ここから page_view を
 * 手動送信すると二重計上になる。
 */
export const GA_INIT_SNIPPET = `(function(){
  var h = location.hostname;
  if (h !== '${GA_HOST}' && h.slice(-${GA_HOST.length + 1}) !== '.${GA_HOST}') return;
  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  var p = location.pathname.length > 1 ? location.pathname.replace(/\\/+$/, '') : location.pathname;
  gtag('config', '${GA_MEASUREMENT_ID}', { page_location: location.origin + (p === '' ? '/' : p) });
})();`;
