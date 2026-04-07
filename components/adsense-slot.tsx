'use client';

import Script from 'next/script';

type Props = {
  slot?: string;
  className?: string;
};

export function AdSenseSlot({ slot = '1234567890', className }: Props) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

  if (!client) {
    return (
      <div className={`paper border-dashed px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400 ${className || ''}`}>
        Premium ad inventory placeholder. Add NEXT_PUBLIC_ADSENSE_CLIENT and your live slot IDs when you're approved.
      </div>
    );
  }

  return (
    <>
      <Script async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`} crossOrigin="anonymous" strategy="afterInteractive" />
      <ins
        className={`adsbygoogle block overflow-hidden rounded-[28px] bg-white dark:bg-slate-900 ${className || ''}`}
        style={{ display: 'block' }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
      <Script id={`adsense-init-${slot}`} strategy="afterInteractive">
        {`(adsbygoogle = window.adsbygoogle || []).push({});`}
      </Script>
    </>
  );
}
