"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteProduct } from "./actions";

export function DeleteProductButton({ productId }: { productId: string }) {
	const t = useTranslations("settings");
	const [state, action, pending] = useActionState(deleteProduct, null);

	useEffect(() => {
		if (state?.ok) toast.success(t("toastProductDeleted"));
	}, [state, t]);

	return (
		<form action={action}>
			<input type="hidden" name="product_id" defaultValue={productId} />
			<Button type="submit" variant="ghost" size="icon" aria-label={t("delete")} disabled={pending}>
				<Trash2 className="size-4" />
			</Button>
		</form>
	);
}
