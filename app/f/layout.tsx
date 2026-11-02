import { DISCLAIMER } from "@/lib/config";

export default function FamilyLayout({ children }: LayoutProps<"/f">) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6 text-lg">
      <div className="flex flex-1 flex-col">{children}</div>
      <footer className="mt-10 border-t-2 border-border pt-4 text-base text-muted">
        {DISCLAIMER} It is not an emergency service.
      </footer>
    </div>
  );
}
