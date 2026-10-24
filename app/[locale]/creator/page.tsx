import StudioPage from "../studio/page";

export default function CreatorSpace({ params }: { params: Promise<{ locale: string }> }) {
  return <StudioPage params={params} />;
}
