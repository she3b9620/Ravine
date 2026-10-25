import StudioPage from "../studio/page";

export const dynamic = "force-dynamic";

/**
 * The creator-space entry point is rendered directly instead of redirecting.
 * This keeps the localized route stable in deployments and preserves the
 * active creator identity while the user is moving through the sidebar.
 */
export default function CreatorSpace({ params }: { params: Promise<{ locale: string }> }) {
  return <StudioPage params={params} />;
}
