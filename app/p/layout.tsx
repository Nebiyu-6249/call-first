import { ParentFooter } from "@/components/parent/ParentFooter";
import { TextSizeApplier } from "@/components/parent/TextSizeApplier";

export default function ParentLayout({ children }: LayoutProps<"/p">) {
  return (
    <>
      {/* Large text (22px base) from the first paint; Extra Large is applied on the device. */}
      <style>{"html{font-size:137.5%}"}</style>
      <TextSizeApplier />
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-6">
        <div className="flex flex-1 flex-col">{children}</div>
        <ParentFooter />
      </div>
    </>
  );
}
