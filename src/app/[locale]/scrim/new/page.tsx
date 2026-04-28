import type { Metadata } from "next";
import { nanoid } from "nanoid";
import { redirect } from "@/i18n/navigation";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function NewScrimPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const id = nanoid(10);
  redirect({ href: `/scrim/${id}`, locale });
}
