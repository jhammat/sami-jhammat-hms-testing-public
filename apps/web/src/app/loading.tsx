import { WonFlowRouteLoader } from "@/components/brand/wonflow-route-loader";

export default function Loading() {
  return (
    <WonFlowRouteLoader
      label="Loading page…"
      overlay
      visible
    />
  );
}
