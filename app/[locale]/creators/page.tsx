export default async function CreatorsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const ar = locale === "ar";
  return <section className="section"><div className="eyebrow">RAVINE / CREATORS</div><h1>{ar ? "الأشخاص خلف الأعمال." : "The people behind the work."}</h1><p className="section-note">{ar ? "ملفات إبداعية احترافية، اعتمادات واضحة، وسمعة مبنية على المساهمة الفعلية." : "Professional creative identities, visible credits, and reputation built on real contribution."}</p></section>;
}
