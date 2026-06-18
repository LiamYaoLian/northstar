import { redirect } from "next/navigation";

export default function ReviewPage() {
  redirect("/alignment?period=week#snapshots");
}
