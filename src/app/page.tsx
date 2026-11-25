import { AccountProvider } from "./Account";
import Studio from "./Studio";

export default function Home() {
  return (
    <AccountProvider>
      <Studio />
    </AccountProvider>
  );
}
