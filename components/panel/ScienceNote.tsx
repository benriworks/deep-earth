'use client';

import { Card, CardContent } from '@/components/ui/card';

export default function ScienceNote() {
  return (
    <Card size="sm" className="bg-white/5 ring-white/10">
      <CardContent className="text-xs leading-relaxed text-muted-foreground">
        本シミュレータは PREM(予備的基準地球モデル)の近似値を使用しています。層内の物性は線形補間による簡略化です。プローブの降下速度は教育目的で大幅に誇張されています。実際の地殻は半径比で非常に薄いため、図では見えにくいことがあります。
      </CardContent>
    </Card>
  );
}
