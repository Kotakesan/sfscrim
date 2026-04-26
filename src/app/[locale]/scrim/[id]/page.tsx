import { setRequestLocale } from "next-intl/server";
import { ScrimWorkspace } from "./scrim-workspace";

export default async function ScrimDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return <ScrimWorkspace id={id} />;
}
