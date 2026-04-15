import { redirect } from "next/navigation";
import { isGersSlimUi } from "@/lib/gers";

export default function AdminPage() {
  redirect(isGersSlimUi() ? "/admin/users" : "/admin/llm-keys");
}
