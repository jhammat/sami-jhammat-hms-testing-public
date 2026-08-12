import { WonFlowRouteLoader } from "@/components/brand/wonflow-route-loader";

export default function Loading() {
  return (
    <WonFlowRouteLoader label="Loading platform overview…" overlay={false} visible />
  );
}
