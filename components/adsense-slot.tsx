type Props = {
  className?: string;
};

export function AdSenseSlot({ className = '' }: Props) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

  if (!client) {
    return <div className={className} />;
  }

  return (
    <div className={className}>
      {/* AdSense will go here later */}
    </div>
  );
}