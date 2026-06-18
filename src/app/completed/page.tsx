import { redirect } from "next/navigation";

type CompletedPageProps = {
  searchParams: Promise<{ range?: string }>;
};

export default async function CompletedPage({ searchParams }: CompletedPageProps) {
  const { range } = await searchParams;
  let period = "week";
  if (range === "today") period = "today";
  else if (range === "all") period = "all";
  redirect(`/alignment?period=${period}#completions`);
}
