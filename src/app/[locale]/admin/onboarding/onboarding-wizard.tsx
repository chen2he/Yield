"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { routing } from "@/i18n/routing";
import { AddAppIdForm } from "../(panel)/settings/add-app-id-form";
import { AddProductForm } from "../(panel)/settings/add-product-form";
import { saveSettings } from "../(panel)/settings/actions";
import { DeleteAppIdButton } from "../(panel)/settings/delete-app-id-button";
import { DeleteProductButton } from "../(panel)/settings/delete-product-button";
import { PushManager } from "../(panel)/settings/push-manager";
import type { AppSettings, ProductLabel } from "@/lib/asc/settings";
import { completeOnboarding } from "./actions";

const LOCALE_NAMES: Record<string, string> = { en: "English", "zh-Hans": "简体中文" };
const STEP_COUNT = 5;

export function OnboardingWizard({
	locale,
	settings,
	products,
	allowedAppIds,
	currencies,
	vapidPublicKey,
}: {
	locale: string;
	settings: AppSettings;
	products: ProductLabel[];
	allowedAppIds: number[];
	currencies: string[];
	vapidPublicKey: string;
}) {
	const t = useTranslations("onboarding");
	const [step, setStep] = useState(0);
	const [prefsState, prefsAction, prefsPending] = useActionState(saveSettings, null);
	const [finishing, setFinishing] = useState(false);

	useEffect(() => {
		if (prefsState?.ok) setStep(2);
	}, [prefsState]);

	const fieldLabel = "text-xs font-medium text-muted-foreground";
	const dots = (
		<div className="mb-6 flex items-center justify-center gap-1.5">
			{Array.from({ length: STEP_COUNT }, (_, i) => (
				<span
					key={i}
					className={`h-1.5 rounded-full transition-all ${i === step - 1 ? "w-6 bg-primary" : "w-1.5 bg-border"}`}
				/>
			))}
		</div>
	);

	async function finish() {
		setFinishing(true);
		await completeOnboarding(locale);
	}

	return (
		<div className="w-full max-w-md">
			<div className="mb-6 flex items-center gap-2.5">
				<Image
					src="/icons/icon-192.png"
					alt={t("brand")}
					width={24}
					height={24}
					style={{ borderRadius: "6px", display: "block", boxShadow: "0 1px 3px rgba(0,0,0,0.12)" }}
				/>
				<p className="text-sm font-semibold tracking-tight">{t("brand")}</p>
			</div>

			{step > 0 ? dots : null}

			<div className="rounded-xl border border-border bg-card p-6 shadow-sm">
				{step === 0 ? (
					<div>
						<h1 className="text-lg font-semibold tracking-tight">{t("welcomeTitle")}</h1>
						<p className="mt-2 text-sm text-muted-foreground">{t("welcomeDescription")}</p>
						<Button className="mt-5 w-full" onClick={() => setStep(1)}>
							{t("getStarted")}
						</Button>
					</div>
				) : null}

				{step === 1 ? (
					<div>
						<h2 className="text-sm font-semibold">{t("prefsTitle")}</h2>
						<p className="mt-1 text-xs text-muted-foreground">{t("prefsDescription")}</p>
						<form action={prefsAction} className="mt-4 space-y-4">
							<div>
								<span className={fieldLabel}>{t("currencyLabel")}</span>
								<div className="mt-1.5">
									<Select name="currency" defaultValue={settings.currency}>
										<SelectTrigger className="w-40">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{currencies.map((c) => (
												<SelectItem key={c} value={c}>
													{c}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>
							<div>
								<label htmlFor="ob-bark" className={fieldLabel}>
									{t("barkLabel")}
								</label>
								<Input
									id="ob-bark"
									name="bark_device_id"
									defaultValue={settings.barkDeviceId}
									placeholder={t("barkHint")}
									className="mt-1.5"
								/>
							</div>
							<div>
								<label htmlFor="ob-oc" className={fieldLabel}>
									{t("ocLabel")}
								</label>
								<Input
									id="ob-oc"
									name="oc_device_id"
									defaultValue={settings.ocDeviceId}
									placeholder={t("ocHint")}
									className="mt-1.5"
								/>
							</div>
							<div>
								<span className={fieldLabel}>{t("pushLocaleLabel")}</span>
								<div className="mt-1.5">
									<Select name="push_locale" defaultValue={settings.pushLocale}>
										<SelectTrigger className="w-40">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{routing.locales.map((l) => (
												<SelectItem key={l} value={l}>
													{LOCALE_NAMES[l] ?? l}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>
							<Button type="submit" className="w-full" disabled={prefsPending}>
								{t("continue")}
							</Button>
						</form>
					</div>
				) : null}

				{step === 2 ? (
					<div>
						<h2 className="text-sm font-semibold">{t("pushTitle")}</h2>
						<p className="mt-1 text-xs text-muted-foreground">{t("pushDescription")}</p>
						<div className="mt-4">
							<PushManager vapidPublicKey={vapidPublicKey} locale={locale} />
						</div>
						<div className="mt-5 flex gap-2">
							<Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
								{t("back")}
							</Button>
							<Button className="flex-1" onClick={() => setStep(3)}>
								{t("continue")}
							</Button>
						</div>
					</div>
				) : null}

				{step === 3 ? (
					<div>
						<h2 className="text-sm font-semibold">{t("appIdTitle")}</h2>
						<p className="mt-1 text-xs text-muted-foreground">{t("appIdDescription")}</p>
						<AddAppIdForm />
						<div className="mt-4">
							{allowedAppIds.length === 0 ? (
								<p className="text-xs text-muted-foreground">{t("noAppIds")}</p>
							) : (
								<ul className="divide-y divide-border/60 rounded-lg border border-border">
									{allowedAppIds.map((id) => (
										<li key={id} className="flex items-center justify-between gap-3 px-3 py-2">
											<div className="truncate font-mono text-sm">{id}</div>
											<DeleteAppIdButton appAppleId={id} />
										</li>
									))}
								</ul>
							)}
						</div>
						<div className="mt-5 flex gap-2">
							<Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
								{t("back")}
							</Button>
							<Button className="flex-1" onClick={() => setStep(4)}>
								{t("continue")}
							</Button>
						</div>
					</div>
				) : null}

				{step === 4 ? (
					<div>
						<h2 className="text-sm font-semibold">{t("productsTitle")}</h2>
						<p className="mt-1 text-xs text-muted-foreground">{t("productsDescription")}</p>
						<AddProductForm />
						<div className="mt-4">
							{products.length === 0 ? (
								<p className="text-xs text-muted-foreground">{t("noProducts")}</p>
							) : (
								<ul className="divide-y divide-border/60 rounded-lg border border-border">
									{products.map((p) => (
										<li key={p.product_id} className="flex items-center justify-between gap-3 px-3 py-2">
											<div className="min-w-0">
												<div className="truncate text-sm font-medium">{p.label}</div>
												<div className="truncate font-mono text-xs text-muted-foreground">{p.product_id}</div>
											</div>
											<DeleteProductButton productId={p.product_id} />
										</li>
									))}
								</ul>
							)}
						</div>
						<div className="mt-5 flex gap-2">
							<Button variant="outline" className="flex-1" onClick={() => setStep(3)}>
								{t("back")}
							</Button>
							<Button className="flex-1" onClick={() => setStep(5)}>
								{t("continue")}
							</Button>
						</div>
					</div>
				) : null}

				{step === 5 ? (
					<div>
						<h1 className="text-lg font-semibold tracking-tight">{t("doneTitle")}</h1>
						<p className="mt-2 text-sm text-muted-foreground">{t("doneDescription")}</p>
						<Button className="mt-5 w-full" disabled={finishing} onClick={() => void finish()}>
							{t("enterOverview")}
						</Button>
					</div>
				) : null}
			</div>

			{step > 0 && step < 5 ? (
				<button
					type="button"
					className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground"
					onClick={() => {
						setStep(5);
						toast.info(t("skipHint"));
					}}
				>
					{t("skip")}
				</button>
			) : null}
		</div>
	);
}
