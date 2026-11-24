import { LandingView } from "./views/LandingView";

/** 005 S1 - Landing. No data of its own; the router wraps it in the guard that sends a signed-in account home. */
export function LandingPage() {
  return <LandingView />;
}
