import { billingOn } from "@/server/auth";
import Landing from "./Landing";

export default function Home() {
  return <Landing accounts={billingOn()} />;
}
