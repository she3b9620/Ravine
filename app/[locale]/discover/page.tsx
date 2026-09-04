export default async function DiscoverPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const ar = locale === "ar";
  return <section className="section"><div className="eyebrow">RAVINE / DISCOVER</div><h1>{ar ? "اكتشف أعمالًا جديدة." : "Discover new work."}</h1><p className="section-note">{ar ? "هذه المساحة ستصبح محرك الاكتشاف الأساسي: أعمال، فئات، Hidden Gems، وRAVINE Select." : "This becomes the core discovery surface: work, categories, Hidden Gems, and RAVINE Select."}</p></section>;
}
