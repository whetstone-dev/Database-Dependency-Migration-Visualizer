import DocumentationPage from "../../../DocumentationPage";
import { docsCopies, topicOrder, type TopicSlug } from "../../../docs";

export const dynamicParams = false;
export function generateStaticParams() {
  return topicOrder.map((slug) => ({ slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: TopicSlug }>;
}) {
  const { slug } = await params;
  return { title: `${docsCopies.en.topics[slug].title} · dbdep` };
}
export default async function TopicPage({
  params,
}: {
  params: Promise<{ slug: TopicSlug }>;
}) {
  const { slug } = await params;
  return <DocumentationPage slug={slug} />;
}
