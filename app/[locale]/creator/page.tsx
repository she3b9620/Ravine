import StudioPage from "../studio/page";

export const dynamic = "force-dynamic";

export default function CreatorSpace({ params }: { params: Promise<{ locale: string }> }) {
  return <StudioPage params={params} />;
}
