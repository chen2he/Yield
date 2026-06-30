import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Geist, Geist_Mono, Noto_Sans } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { PwaRegister } from "@/components/pwa-register";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import "../globals.css";

const notoSans = Noto_Sans({ subsets: ["latin"], variable: "--font-sans" });
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export function generateStaticParams() {
	return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await params;
	const t = await getTranslations({ locale, namespace: "app" });
	return {
		title: t("name"),
		description: t("description"),
		applicationName: "Yield",
		manifest: "/manifest.webmanifest",
		icons: {
			icon: [
				{ url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
				{ url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
				{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
			],
			apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
		},
		appleWebApp: { capable: true, title: "Yield", statusBarStyle: "default" },
	};
}

export const viewport: Viewport = {
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#ffffff" },
		{ media: "(prefers-color-scheme: dark)", color: "#0b0c0e" },
	],
};

export default async function LocaleLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	if (!hasLocale(routing.locales, locale)) notFound();
	setRequestLocale(locale);
	const messages = await getMessages();

	return (
		<html lang={locale} className={cn("font-sans", notoSans.variable)} suppressHydrationWarning>
			<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
				<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
					<NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
					<Toaster position="top-center" />
					<PwaRegister />
				</ThemeProvider>
			</body>
		</html>
	);
}
