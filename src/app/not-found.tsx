import { BackLink, EmptyState, Screen } from "@/components/layout/page";

export default function NotFound() {
  return (
    <Screen>
      <BackLink />
      <EmptyState title="Page introuvable">
        <p>Cette page n&apos;existe pas ou plus.</p>
      </EmptyState>
    </Screen>
  );
}
