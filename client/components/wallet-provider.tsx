"use client";

import { WalletSelectorProvider } from "@near-wallet-selector/react-hook";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import { setupMeteorWallet } from "@near-wallet-selector/meteor-wallet";
import type { ReactNode } from "react";

const walletSelectorConfig = {
  network: "testnet" as const,
  modules: [setupMyNearWallet(), setupMeteorWallet()],
};

export function NearWalletProvider({ children }: { children: ReactNode }) {
  return (
    <WalletSelectorProvider config={walletSelectorConfig}>
      {children}
    </WalletSelectorProvider>
  );
}
