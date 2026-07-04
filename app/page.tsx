import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-bold tracking-tight">地球地下シミュレータ</h1>
      <p className="text-muted-foreground max-w-md">
        地球内部の構造をリアルタイムに可視化・操作できるインタラクティブシミュレータです。
      </p>
      <Button size="lg" render={<Link href="/simulator" />}>
        シミュレータを開く
      </Button>
    </div>
  );
}
