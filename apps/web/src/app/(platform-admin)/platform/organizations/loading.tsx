import {
  WonFlowRouteLoader,
} from "@/components/brand/wonflow-route-loader";

export default function Loading() {
  return (
    <WonFlowRouteLoader
      label="Loading tenant organizations…"
      overlay={false}
      visible
    />
  );
}
