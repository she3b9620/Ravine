import FilmCollectionBrowser from "@/components/FilmCollectionBrowser";
import { getRAVINEFilmCollection } from "@/lib/ravine-film-collections";

export const dynamic = "force-dynamic";

export default async function ShortFilmsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale === "en" ? "en" : "ar";
  const collection = await getRAVINEFilmCollection("short_film");

  return (
    <FilmCollectionBrowser
      locale={locale}
      format="short_film"
      items={collection.items}
      schemaReady={collection.schemaReady}
      unclassifiedCount={collection.unclassifiedCount}
      loadError={collection.loadError}
    />
  );
}
