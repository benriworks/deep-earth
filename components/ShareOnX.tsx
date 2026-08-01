/**
 * Xでこのページを共有するリンク。
 * 追加のJSを持たない素のリンクなので、クライアントコンポーネント化は不要。
 */
const SHARE_TEXT = "地球地下シミュレータ｜足元から地球の中心まで、深さの感覚をつかむ";
const SHARE_URL = "https://deep-earth.benriwork.jp/";

const shareHref = `https://x.com/intent/post?${new URLSearchParams({
  text: SHARE_TEXT,
  url: SHARE_URL,
  hashtags: "BenriWorks",
}).toString()}`;

export default function ShareOnX() {
  return (
    <a
      href={shareHref}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-full bg-white text-black hover:bg-white/85 px-5 py-2.5 text-sm font-bold no-underline transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
      Xで共有
    </a>
  );
}
