"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addProduct } from "./actions";

export function AddProductForm() {
	const t = useTranslations("settings");
	const formRef = useRef<HTMLFormElement>(null);
	const [state, action, pending] = useActionState(addProduct, null);

	useEffect(() => {
		if (state?.ok) {
			toast.success(t("toastProductAdded"));
			formRef.current?.reset();
		}
	}, [state, t]);

	const fieldLabel = "text-xs font-medium text-muted-foreground";
	return (
		<form ref={formRef} action={action} className="mt-4 flex flex-wrap items-end gap-2">
			<div className="min-w-40 flex-1">
				<label htmlFor="pid" className={fieldLabel}>
					{t("productIdLabel")}
				</label>
				<Input id="pid" name="product_id" required placeholder="com.example.app.pro" className="mt-1.5 font-mono" />
			</div>
			<div className="min-w-32 flex-1">
				<label htmlFor="plabel" className={fieldLabel}>
					{t("labelLabel")}
				</label>
				<Input id="plabel" name="label" required placeholder={t("labelPlaceholder")} className="mt-1.5" />
			</div>
			<Button type="submit" size="sm" disabled={pending}>
				{t("add")}
			</Button>
		</form>
	);
}
