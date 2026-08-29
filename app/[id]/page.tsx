import AppClient from "../AppClient";

interface DocPageProps {
  params: Promise<{ id: string }>;
}

export default async function DocPage({ params }: DocPageProps) {
  const { id } = await params;
  return <AppClient routeDocId={id} />;
}
