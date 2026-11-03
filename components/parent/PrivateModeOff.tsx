import { Keyboard } from "lucide-react";
import { BackLink } from "./BackLink";
import { ParentLink, Screen } from "./nav";
import { primaryButton } from "./styles";

// Shown instead of the photo or voice screen when the family has turned on private mode.
export function PrivateModeOff({ title }: { title: string }) {
  return (
    <Screen className="flex flex-1 flex-col gap-6">
      <BackLink to="check" />
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="text-xl">
        Your family has set this phone to check things on the phone only, so this is switched off. You can type or
        paste the message instead.
      </p>
      <ParentLink to="text" className={primaryButton}>
        <Keyboard aria-hidden="true" className="size-7" />
        Type or paste
      </ParentLink>
    </Screen>
  );
}
