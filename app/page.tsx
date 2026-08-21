import Link from 'next/link';
import { Button } from '@/components/ui/button';
import ShareOnX from '@/components/ShareOnX';

const siteUrl = 'https://deep-earth.benriwork.jp';

const webAppJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: '地球地下シミュレータ',
  url: `${siteUrl}/`,
  description:
    '地下深くへ潜る体験を通じて、地層・地下構造・地球内部のスケール感、地震波やマントル対流を学べる無料のインタラクティブ3Dシミュレータです。',
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Web',
  inLanguage: 'ja',
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'JPY' },
  publisher: {
    '@type': 'Organization',
    '@id': 'https://benriwork.jp/#organization',
    name: 'BenriWorks',
    url: 'https://benriwork.jp/',
  },
};

const faqItems = [
  {
    question: '無料で使えますか？',
    answer:
      'はい、すべての機能を無料で利用できます。アカウント登録やアプリのインストールは不要で、ブラウザを開くだけで使えます。',
  },
  {
    question: 'スマートフォンでも動きますか？',
    answer:
      'WebGLに対応した最新のブラウザであれば、スマートフォンやタブレットでも動作します。3D表示をより快適に操作するには、PCでの利用がおすすめです。',
  },
  {
    question: '地球の中心は何度くらいですか？',
    answer:
      '地球の中心にある内核は約5,000〜6,000℃と推定されており、太陽の表面温度に近い高温です。それでも巨大な圧力のため、内核の鉄は固体の状態を保っていると考えられています。',
  },
  {
    question: 'このシミュレータで何が学べますか？',
    answer:
      '地殻・マントル・外核・内核という地球の層構造と深さのスケール感、P波・S波といった地震波の伝わり方、マントル対流のようすを、3D表示を操作しながら直感的に学べます。',
  },
];

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqItems.map(({ question, answer }) => ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: { '@type': 'Answer', text: answer },
  })),
};

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-slate-950 px-4 py-16 text-slate-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <section className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight">地球地下シミュレータ</h1>
        <p className="max-w-md text-slate-400">
          地球内部の構造をリアルタイムに可視化・操作できるインタラクティブシミュレータです。
          断面カットで層構造を観察し、地震波の伝播やマントル対流を体験できます。
        </p>
        <Button
          size="lg"
          nativeButton={false}
          render={<Link href="/simulator" />}
          className="bg-sky-500 text-white hover:bg-sky-400"
        >
          シミュレータを開く
        </Button>
        <p className="max-w-md text-xs text-slate-500">
          PREM(予備的基準地球モデル)近似の科学データに基づく教育用シミュレータ
        </p>
      </section>

      <div className="w-full max-w-2xl space-y-12 border-t border-slate-800 py-16 text-left">
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight">地球の内部構造</h2>
          <p className="leading-relaxed text-slate-400">
            地球の内部は、外側から地殻・マントル・外核・内核という層に分かれています。
            私たちが立っている地殻の厚さは大陸で数十km程度にすぎず、その下には深さ約2,900kmまで岩石でできたマントルが広がります。
            さらに深くには液体の鉄を主成分とする外核、そして中心の深さ約6,400km(地球の半径)には固体の内核があります。
            シミュレータでは断面カットでこの層構造を切り開き、それぞれの層の厚さや深さのスケール感を実際に潜りながら確かめられます。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight">地震波で地球の中身がわかる仕組み</h2>
          <p className="leading-relaxed text-slate-400">
            人類はまだ地球を深く掘り抜いたことはありません。それでも内部の構造がわかるのは、地震波を観測しているからです。
            地震が起きると、伝わる速さの速いP波(縦波)と、遅いS波(横波)が地球内部を進みます。
            S波は液体の中を伝わることができないため、外核が液体であることがわかりました。
            波の速さや屈折のしかたを世界中の観測点で調べることで、地球内部の姿が明らかになってきたのです。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight">マントル対流とは</h2>
          <p className="leading-relaxed text-slate-400">
            マントルは固体の岩石ですが、数千万年〜数億年という長い時間スケールで見ると、熱によってゆっくりと流動しています。
            温められた物質が上昇し、冷えた物質が沈み込むこの動きがマントル対流で、地表のプレートを動かす原動力と考えられています。
            プレートの運動は地震や火山活動、大陸の移動にもつながっています。シミュレータではこのゆっくりとした流れをアニメーションとして観察できます。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight">こんな場面で使えます</h2>
          <p className="leading-relaxed text-slate-400">
            中学・高校の理科や地学の授業での提示教材として、夏休みの自由研究の題材として、
            また大人の地学の学び直しにも活用できます。教科書の断面図だけではつかみにくい
            「地球の深さ」の感覚を、自分の手で操作しながら体験してみてください。
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">よくある質問</h2>
          <dl className="space-y-4">
            {faqItems.map(({ question, answer }) => (
              <div key={question} className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                <dt className="font-medium text-slate-200">{question}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-slate-400">{answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <div className="flex flex-col items-center gap-3 border-t border-slate-800 pt-8">
        <p className="text-xs text-slate-500">授業や自由研究で使えそうな方に共有できます。</p>
        <ShareOnX />
      </div>
    </div>
  );
}
