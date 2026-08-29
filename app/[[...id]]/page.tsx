import AppClient from "../AppClient";

interface CatchAllProps {
  params: Promise<{ id?: string[] }>;
}

export default async function CatchAllPage({ params }: CatchAllProps) {
  const resolvedParams = await params;
  const docId =
    Array.isArray(resolvedParams.id) && resolvedParams.id.length > 0
      ? resolvedParams.id[0]
      : null;

  return <AppClient routeDocId={docId} />;
}
