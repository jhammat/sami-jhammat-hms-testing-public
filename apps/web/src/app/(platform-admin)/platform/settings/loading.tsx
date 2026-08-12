import { WonFlowRouteLoader } from "@/components/brand/wonflow-route-loader";

export default function Loading() {
  return (
    <WonFlowRouteLoader label="Loading system settings…" overlay={false} visible />
  );
}
