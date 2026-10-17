import FilmCollectionBrowser from "@/components/FilmCollectionBrowser";
import { getRAVINEFilmCollection } from "@/lib/ravine-film-collections";

export const dynamic = "force-dynamic";

export default async function FeatureFilmsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale === "en" ? "en" : "ar";
  const collection = await getRAVINEFilmCollection("feature_film");

  return (
    <FilmCollectionBrowser
      locale={locale}
      format="feature_film"
      items={collection.items}
      schemaReady={collection.schemaReady}
      unclassifiedCount={collection.unclassifiedCount}
      loadError={collection.loadError}
    />
  );
}
