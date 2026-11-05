import { PurchaseGate } from "@/components/purchase-gate";
import { ShinnoApp } from "@/components/shinno-app";

export default function Home() {
  return (
    <PurchaseGate>
      <ShinnoApp />
    </PurchaseGate>
  );
}
