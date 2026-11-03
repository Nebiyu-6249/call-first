import { OfflineSupport } from "@/components/parent/OfflineSupport";
import { ParentFooter } from "@/components/parent/ParentFooter";
import { TextSizeApplier } from "@/components/parent/TextSizeApplier";

const PARENT_TEXT_SCRIPT = "document.documentElement.classList.add('parent-text')";

export default function ParentLayout({ children }: LayoutProps<"/p">) {
  return (
    <>
      {/* Large text (22px base) from the first paint, before any script has loaded. */}
      <script dangerouslySetInnerHTML={{ __html: PARENT_TEXT_SCRIPT }} />
      <TextSizeApplier />
      <OfflineSupport />
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-6">
        <div className="flex flex-1 flex-col">{children}</div>
        <ParentFooter />
      </div>
    </>
  );
}
