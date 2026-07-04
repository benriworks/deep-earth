import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 p-8 text-center text-slate-100">
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
    </div>
  );
}
