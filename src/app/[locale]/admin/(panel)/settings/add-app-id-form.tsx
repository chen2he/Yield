"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addAllowedApp } from "./actions";

export function AddAppIdForm() {
	const t = useTranslations("settings");
	const formRef = useRef<HTMLFormElement>(null);
	const [state, action, pending] = useActionState(addAllowedApp, null);

	useEffect(() => {
		if (state?.ok) {
			toast.success(t("toastAppIdAdded"));
			formRef.current?.reset();
		}
	}, [state, t]);

	const fieldLabel = "text-xs font-medium text-muted-foreground";
	return (
		<form ref={formRef} action={action} className="mt-4 flex flex-wrap items-end gap-2">
			<div className="min-w-40 flex-1">
				<label htmlFor="app-apple-id" className={fieldLabel}>
					{t("appIdLabel")}
				</label>
				<Input
					id="app-apple-id"
					name="app_apple_id"
					required
					inputMode="numeric"
					pattern="[0-9]+"
					placeholder="1234567890"
					className="mt-1.5 font-mono"
				/>
			</div>
			<Button type="submit" size="sm" disabled={pending}>
				{t("add")}
			</Button>
		</form>
	);
}
