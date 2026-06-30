import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Geist, Geist_Mono, Noto_Sans } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { PwaRegister } from "@/components/pwa-register";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { routing } from "@/i18n/routing";
import { AUTHOR, AUTHOR_URL, OG_IMAGE, OG_LOCALE, ogImagePath, SEO_KEYWORDS, SITE_NAME, SITE_URL } from "@/lib/site";
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
	const title = `${t("name")} — ${t("tagline")}`;
	const description = t("description");

	// localePrefix: "as-needed" → 默认语言在根路径，其余带语言前缀。
	// canonical / hreflang / og:url 都据此构造（相对路径会用 metadataBase 解析为绝对地址）。
	const pathFor = (l: string) => (l === routing.defaultLocale ? "/" : `/${l}`);
	const languages: Record<string, string> = { "x-default": pathFor(routing.defaultLocale) };
	for (const l of routing.locales) languages[l] = pathFor(l);
	const ogImage = { url: ogImagePath(locale), width: OG_IMAGE.width, height: OG_IMAGE.height, alt: `${SITE_NAME} dashboard` };

	return {
		metadataBase: new URL(SITE_URL),
		title: { default: title, template: `%s · ${SITE_NAME}` },
		description,
		applicationName: SITE_NAME,
		keywords: SEO_KEYWORDS,
		authors: [{ name: AUTHOR, url: AUTHOR_URL }],
		creator: AUTHOR,
		publisher: AUTHOR,
		category: "technology",
		alternates: { canonical: pathFor(locale), languages },
		openGraph: {
			type: "website",
			siteName: SITE_NAME,
			title,
			description,
			url: pathFor(locale),
			locale: OG_LOCALE[locale] ?? locale,
			alternateLocale: routing.locales.filter((l) => l !== locale).map((l) => OG_LOCALE[l] ?? l),
			images: [ogImage],
		},
		twitter: {
			card: "summary_large_image",
			title,
			description,
			images: [ogImage],
		},
		robots: {
			index: true,
			follow: true,
			googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
		},
		manifest: "/manifest.webmanifest",
		icons: {
			icon: [
				{ url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
				{ url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
				{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
			],
			apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
		},
		appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "default" },
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
