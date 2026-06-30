import { setRequestLocale } from "next-intl/server";
import { Landing } from "@/components/landing";

export default async function HomePage({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	setRequestLocale(locale);
	return <Landing />;
}
