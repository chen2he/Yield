"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteAllowedApp } from "./actions";

export function DeleteAppIdButton({ appAppleId }: { appAppleId: number }) {
	const t = useTranslations("settings");
	const [state, action, pending] = useActionState(deleteAllowedApp, null);

	useEffect(() => {
		if (state?.ok) toast.success(t("toastAppIdDeleted"));
	}, [state, t]);

	return (
		<form action={action}>
			<input type="hidden" name="app_apple_id" defaultValue={appAppleId} />
			<Button type="submit" variant="ghost" size="icon" aria-label={t("delete")} disabled={pending}>
				<Trash2 className="size-4" />
			</Button>
		</form>
	);
}
