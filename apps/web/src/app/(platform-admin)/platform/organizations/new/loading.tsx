import { WonFlowRouteLoader } from "@/components/brand/wonflow-route-loader";

export default function Loading() {
  return (
    <WonFlowRouteLoader label="Preparing tenant form…" overlay={false} visible />
  );
}
