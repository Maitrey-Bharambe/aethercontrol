'use client';

import dynamic from 'next/dynamic';

const AirDrawCanvas = dynamic(() => import('@/components/AirDrawCanvas'), { ssr: false });

export default function AirDrawPage() {
  return <AirDrawCanvas />;
}
