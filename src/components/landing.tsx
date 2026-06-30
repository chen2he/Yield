import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { Fragment } from "react";
import { LandingControls } from "@/components/landing-controls";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { AUTHOR, AUTHOR_URL, GITHUB_URL, LICENSE_URL, OC_URL, ogImagePath, SITE_NAME, SITE_URL } from "@/lib/site";
import { HeroFrameCaption } from "./hero-frame-caption";

const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex-sans" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono" });

// 与语言无关的内容：技术名、序号、列表 id（文案在 messages 的 landing 命名空间）。
const STACK = ["Next.js 16", "React 19", "Cloudflare Workers (OpenNext)", "Cloudflare D1", "Tailwind v4", "shadcn/ui", "WebCrypto", "Edge-native"];
const POINT_IDS = ["webhook", "selfHosted", "verified", "edge"] as const;
const FEATURES = [
	{ id: "overview", n: "01" }, { id: "orders", n: "02" }, { id: "feed", n: "03" },
	{ id: "linking", n: "04" }, { id: "push", n: "05" }, { id: "intake", n: "06" },
	{ id: "settings", n: "07" }, { id: "pwa", n: "08" }, { id: "themes", n: "09" },
] as const;
const HOW_STEPS = ["appstore", "verify", "store", "notify"] as const;

const navLink = "transition-colors hover:text-[var(--text)]";
const sectionLabel = "mono text-xs uppercase tracking-[0.14em] text-[var(--accent)]";
const h2 = "mt-3.5 text-[28px] font-semibold tracking-[-1px] sm:text-4xl";

export async function Landing() {
	const t = await getTranslations("landing");
	const tApp = await getTranslations("app");
	const locale = await getLocale();

	// GEO：schema.org 结构化数据，直出在 SSR HTML 中，便于搜索引擎与 LLM 解析产品事实。
	const jsonLd = {
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "WebSite",
				"@id": `${SITE_URL}/#website`,
				url: `${SITE_URL}/`,
				name: SITE_NAME,
				description: tApp("description"),
				inLanguage: [...routing.locales],
				publisher: { "@id": `${SITE_URL}/#author` },
			},
			{
				"@type": "Person",
				"@id": `${SITE_URL}/#author`,
				name: AUTHOR,
				url: AUTHOR_URL,
			},
			{
				"@type": "SoftwareApplication",
				"@id": `${SITE_URL}/#app`,
				name: SITE_NAME,
				url: `${SITE_URL}/`,
				description: tApp("description"),
				applicationCategory: "BusinessApplication",
				applicationSubCategory: "DeveloperApplication",
				operatingSystem: "Cloudflare Workers, Web",
				offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
				isAccessibleForFree: true,
				license: LICENSE_URL,
				softwareRequirements: "Cloudflare account (Workers + D1)",
				featureList: FEATURES.map((f) => t(`features.items.${f.id}.title`)),
				inLanguage: [...routing.locales],
				image: `${SITE_URL}${ogImagePath(locale)}`,
				screenshot: `${SITE_URL}${ogImagePath(locale)}`,
				author: { "@id": `${SITE_URL}/#author` },
				sameAs: [GITHUB_URL, OC_URL],
			},
		],
	};

	const navItems = (
		<>
			<a href="#features" className={navLink}>{t("nav.features")}</a>
			<a href="#how" className={navLink}>{t("nav.how")}</a>
			<a href="#stack" className={navLink}>{t("nav.stack")}</a>
			<a href={GITHUB_URL} target="_blank" rel="noreferrer" className={navLink}>GitHub</a>
		</>
	);

	return (
		<div className={`yield-landing ${plexSans.variable} ${plexMono.variable} min-h-dvh w-full bg-[var(--bg)] text-[var(--text)] antialiased`}>
			{/* biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD 结构化数据，值全来自受控常量/文案 */}
			<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
			{/* NAV */}
			<header className="border-b border-[var(--border2)]">
				<div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4 px-5 py-4 sm:px-8">
					<div className="flex items-center gap-6 lg:gap-8">
						<Link href="/" className="flex items-center gap-2.5">
							<Image src="/icons/icon-192.png" alt="Yield" width={30} height={30} className="rounded-[7px] shadow-[0_1px_3px_rgba(0,0,0,0.12)]" />
							<span className="text-[17px] font-semibold tracking-[-0.3px]">Yield</span>
						</Link>
						<nav className="hidden items-center gap-6 text-sm text-[var(--muted)] md:flex">{navItems}</nav>
					</div>
					<div className="flex items-center gap-3.5">
						<div className="hidden sm:block">
							<LandingControls />
						</div>
						<Link href="/admin" className="rounded-[9px] border border-[var(--btn-bd)] bg-[var(--btn-bg)] px-4 py-2 text-sm font-semibold text-[var(--btn-text)] transition-opacity hover:opacity-90">
							{t("nav.cta")}
						</Link>
					</div>
				</div>
			</header>

			{/* HERO */}
			<section className="relative overflow-hidden">
				<div
					className="pointer-events-none absolute left-1/2 top-[-180px] h-[600px] w-[1100px] max-w-[150%] -translate-x-1/2"
					style={{ background: "radial-gradient(ellipse at center, var(--glow), transparent 68%)" }}
				/>
				<div className="relative mx-auto max-w-[1120px] px-5 pb-14 pt-16 sm:px-8 sm:pt-20">
					<div className="mono inline-flex items-center gap-2.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs text-[var(--muted)]">
						<span className="inline-block h-[7px] w-[7px] animate-[yieldPulse_2s_ease-in-out_infinite] rounded-full bg-[var(--accent2)]" />
						{t("hero.badge")}
					</div>
					<h1 className="mt-6 max-w-[880px] text-balance text-[34px] font-semibold leading-[1.08] tracking-[-1.2px] sm:text-5xl sm:leading-[1.05] sm:tracking-[-2px] lg:text-[62px] lg:leading-[1.04]">
						{t("hero.title")}
					</h1>
					<p className="mt-6 max-w-[680px] text-pretty text-base leading-relaxed text-[var(--muted)] sm:text-lg">{t("hero.subtitle")}</p>
					<div className="mt-8 flex flex-wrap items-center gap-3.5">
						<Link href="/admin" className="rounded-[11px] border border-[var(--btn-bd)] bg-[var(--btn-bg)] px-6 py-3 text-[15px] font-semibold text-[var(--btn-text)] transition-opacity hover:opacity-90">
							{t("hero.ctaPrimary")}
						</Link>
						<a href={GITHUB_URL} target="_blank" rel="noreferrer" className="rounded-[11px] border border-[var(--border)] bg-transparent px-[22px] py-3 text-[15px] font-medium text-[var(--text)] transition-colors hover:bg-[var(--card2)]">
							{t("hero.ctaSecondary")}
						</a>
					</div>

					<div className="mt-12 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.3)] sm:mt-14">
						<div className="flex items-center gap-2 border-b border-[var(--border2)] px-4 py-3">
							<span className="inline-block h-[11px] w-[11px] rounded-full bg-[var(--border)]" />
							<span className="inline-block h-[11px] w-[11px] rounded-full bg-[var(--border)]" />
							<span className="inline-block h-[11px] w-[11px] rounded-full bg-[var(--border)]" />
							<span className="mono ml-3.5 truncate text-xs text-[var(--faint)]">yield.o-c.do/dashboard</span>
						</div>
						<HeroFrameCaption />
					</div>
				</div>
			</section>

			{/* SELLING POINTS */}
			<section className="border-t border-[var(--border2)] bg-[var(--bg2)]">
				<div className="mx-auto max-w-[1120px] px-5 py-16 sm:px-8">
					<div className={sectionLabel}>{t("points.label")}</div>
					<div className="mt-8 grid grid-cols-1 gap-9 sm:grid-cols-2 lg:grid-cols-4">
						{POINT_IDS.map((id) => (
							<div key={id}>
								<div className="h-[3px] w-[26px] rounded-sm bg-[var(--accent2)]" />
								<div className="mt-4 text-base font-semibold tracking-[-0.2px]">{t(`points.items.${id}.title`)}</div>
								<div className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{t(`points.items.${id}.desc`)}</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* FEATURES */}
			<section id="features" className="scroll-mt-16 border-t border-[var(--border2)]">
				<div className="mx-auto max-w-[1120px] px-5 py-16 sm:px-8 sm:py-20">
					<div className={sectionLabel}>{t("features.label")}</div>
					<h2 className={h2}>{t("features.title")}</h2>
					<div className="mt-10 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
						{FEATURES.map((f) => (
							<div key={f.id} className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] p-6">
								<div className="mono text-[13px] font-semibold text-[var(--accent)]">{f.n}</div>
								<div className="mt-3.5 text-[17px] font-semibold tracking-[-0.3px]">{t(`features.items.${f.id}.title`)}</div>
								<div className="mt-2.5 text-sm leading-relaxed text-[var(--muted)]">{t(`features.items.${f.id}.desc`)}</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* HOW IT WORKS */}
			<section id="how" className="scroll-mt-16 border-t border-[var(--border2)] bg-[var(--bg2)]">
				<div className="mx-auto max-w-[1120px] px-5 py-16 sm:px-8 sm:py-20">
					<div className={sectionLabel}>{t("how.label")}</div>
					<h2 className={h2}>{t("how.title")}</h2>
					<div className="mt-10 flex flex-col items-stretch justify-between gap-4 rounded-[18px] border border-[var(--border)] bg-[var(--card)] p-8 sm:p-11 md:flex-row md:items-center md:gap-2">
						{HOW_STEPS.map((step, i) => (
							<Fragment key={step}>
								{i > 0 && (
									<div className="flex rotate-90 items-center justify-center text-[22px] text-[var(--accent2)] md:rotate-0">→</div>
								)}
								<div className="flex flex-1 flex-col items-center gap-2.5 text-center">
									<div
										className={`mono rounded-[10px] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] ${step === "notify"
											? "border border-[var(--accent-soft)] bg-[var(--accent-soft)] text-[var(--accent)]"
											: "border border-[var(--border)] bg-[var(--card2)]"
											}`}
									>
										{t(`how.steps.${step}.label`)}
									</div>
									<div className="text-[13px] text-[var(--muted)]">{t(`how.steps.${step}.sub`)}</div>
								</div>
							</Fragment>
						))}
					</div>
				</div>
			</section>

			{/* STACK */}
			<section id="stack" className="scroll-mt-16 border-t border-[var(--border2)]">
				<div className="mx-auto max-w-[1120px] px-5 py-16 sm:px-8 sm:py-20">
					<div className={sectionLabel}>{t("stack.label")}</div>
					<h2 className={h2}>{t("stack.title")}</h2>
					<div className="mt-8 flex flex-wrap gap-2.5">
						{STACK.map((s) => (
							<div key={s} className="mono inline-flex items-center gap-2.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-[13px]">
								<span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent2)]" />
								{s}
							</div>
						))}
					</div>
				</div>
			</section>

			{/* CROSS-PROMO: Orange Cloud */}
			<section className="border-t border-[var(--border2)]">
				<div className="mx-auto max-w-[1120px] px-5 py-16 sm:px-8 sm:py-20">
					<div className="flex flex-col items-start gap-6 rounded-[18px] border border-[var(--accent-soft)] bg-[var(--accent-soft)] p-8 sm:flex-row sm:items-center sm:justify-between sm:p-11">
						<div className="max-w-[640px]">
							<div className={sectionLabel}>{t("oc.label")}</div>
							<h2 className="mt-3 text-2xl font-semibold tracking-[-0.5px] sm:text-[28px]">{t("oc.title")}</h2>
							<p className="mt-3 text-sm leading-relaxed text-[var(--muted)] sm:text-base">{t("oc.desc")}</p>
						</div>
						<a href={OC_URL} target="_blank" rel="noreferrer" className="shrink-0 rounded-[11px] border border-[var(--btn-bd)] bg-[var(--btn-bg)] px-6 py-3 text-[15px] font-semibold text-[var(--btn-text)] transition-opacity hover:opacity-90">
							{t("oc.cta")} <span aria-hidden="true">→</span>
						</a>
					</div>
				</div>
			</section>

			{/* FOOTER */}
			<footer className="border-t border-[var(--border2)] bg-[var(--bg2)]">
				<div className="mx-auto max-w-[1120px] px-5 pb-11 pt-14 sm:px-8">
					<div className="flex flex-wrap items-start justify-between gap-8">
						<div className="max-w-[340px]">
							<div className="flex items-center gap-2.5">
								<Image src="/icons/icon-192.png" alt="Yield" width={28} height={28} className="rounded-[7px]" />
								<span className="text-base font-semibold tracking-[-0.3px]">Yield</span>
							</div>
							<p className="mt-3.5 text-sm leading-relaxed text-[var(--muted)]">{t("footer.blurb")}</p>
						</div>
						<nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--muted)]">{navItems}</nav>
					</div>
					<div className="mt-9 flex flex-wrap items-center justify-between gap-5 border-t border-[var(--border2)] pt-[22px]">
						<div className="mono flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-[var(--faint)]">
							<span>{t("footer.copyright")}</span>
							<a href={OC_URL} target="_blank" rel="noreferrer" className="transition-colors hover:text-[var(--accent)]">{t("footer.oc")}</a>
							<a href={GITHUB_URL} target="_blank" rel="noreferrer" className="text-[var(--accent)] hover:underline">{t("footer.license")}</a>
						</div>
						<LandingControls />
					</div>
				</div>
			</footer>
		</div>
	);
}
