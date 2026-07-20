import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });
const siteUrl = 'https://deep-earth.benriwork.jp';
const title = '地球地下シミュレータ — 地球内部を体験して学ぶ | BenriWorks';
const description = '地下深くへ潜る体験を通じて、地層・地下構造・地球内部のスケール感、地震波やマントル対流を学べる無料のインタラクティブ3Dシミュレータです。';

export const viewport: Viewport = { themeColor: '#020617', colorScheme: 'dark' };
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl), title, description, alternates: { canonical: '/' },
  openGraph: { type: 'website', title, description, url: '/', siteName: 'BenriWorks', locale: 'ja_JP' },
  twitter: { card: 'summary_large_image', title, description }
};
const structuredData = {
  '@context': 'https://schema.org', '@type': 'WebApplication', name: '地球地下シミュレータ', url: `${siteUrl}/`, description,
  applicationCategory: 'EducationalApplication', operatingSystem: 'Web', inLanguage: 'ja', isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'JPY' },
  publisher: { '@type': 'Organization', '@id': 'https://benriwork.jp/#organization', name: 'BenriWorks', url: 'https://benriwork.jp/' }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
    <Script id="webapp-jsonld" type="application/ld+json">{JSON.stringify(structuredData)}</Script>
    <Script defer src="/_vercel/insights/script.js" strategy="afterInteractive" />
    {children}
    <footer className="border-t border-slate-800 bg-slate-950 px-4 py-6 text-center text-xs text-slate-400"><nav className="flex justify-center gap-4"><a href="https://benriwork.jp/" className="underline">BenriWorks</a><a href="https://benriwork.jp/products/" className="underline">他のプロダクトを見る</a></nav></footer>
  </body></html>;
}
