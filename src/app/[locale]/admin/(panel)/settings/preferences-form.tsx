"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { routing } from "@/i18n/routing";
import { saveSettings } from "./actions";

// 各语言以本族名展示（与界面语言无关）。
const LOCALE_NAMES: Record<string, string> = { en: "English", "zh-Hans": "简体中文" };

export function PreferencesForm({
	settings,
	currencies,
}: {
	settings: { currency: string; barkDeviceId: string; ocDeviceId: string; pushLocale: string };
	currencies: string[];
}) {
	const t = useTranslations("settings");
	const [state, action, pending] = useActionState(saveSettings, null);

	useEffect(() => {
		if (state?.ok) toast.success(t("toastSaved"));
	}, [state, t]);

	const fieldLabel = "text-xs font-medium text-muted-foreground";
	return (
		<form action={action} className="mt-4 space-y-4">
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
				<label htmlFor="bark" className={fieldLabel}>
					{t("barkLabel")}
				</label>
				<Input
					id="bark"
					name="bark_device_id"
					defaultValue={settings.barkDeviceId}
					placeholder={t("barkHint")}
					className="mt-1.5 max-w-md"
				/>
			</div>
			<div>
				<label htmlFor="oc" className={fieldLabel}>
					{t("ocLabel")}
				</label>
				<Input
					id="oc"
					name="oc_device_id"
					defaultValue={settings.ocDeviceId}
					placeholder={t("ocHint")}
					className="mt-1.5 max-w-md"
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
			<Button type="submit" size="sm" disabled={pending}>
				{t("save")}
			</Button>
		</form>
	);
}
