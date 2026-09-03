import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import GuestHomeGate from "@/components/GuestHomeGate";

export default async function LocaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <GuestHomeGate>{children}</GuestHomeGate>
    </NextIntlClientProvider>
  );
}
