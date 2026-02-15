"use client";

import { useState } from "react";
import { Lock, UserPlus, UserMinus, RefreshCw, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { VaultResponse } from "@/lib/types";

interface VaultStepProps {
  data: VaultResponse | null;
  novaVaultId: string;
  loading: boolean;
  error: string | null;
  onFetchVault: (groupId: string) => void;
  onGrant: (groupId: string, memberId: string) => void;
  onRevoke: (groupId: string, memberId: string) => void;
  onReset: () => void;
}

export function VaultStep({
  data,
  novaVaultId,
  loading,
  error,
  onFetchVault,
  onGrant,
  onRevoke,
  onReset,
}: VaultStepProps) {
  const [memberId, setMemberId] = useState("");

  const vault = data?.vault;

  return (
    <div className="flex justify-center px-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500/15">
              <Lock className="h-7 w-7 text-indigo-500" />
            </div>
          </div>
          <CardTitle className="text-xl">NOVA Privacy Vault</CardTitle>
          <CardDescription>
            Your raw biometric data is encrypted and stored in a NOVA vault.
            Control who can access it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Vault ID */}
          <div className="bg-muted rounded-lg px-3 py-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Vault ID</span>
              <span className="font-mono text-xs">{novaVaultId}</span>
            </div>
          </div>

          {/* Fetch button if no data yet */}
          {!vault && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onFetchVault(novaVaultId)}
              disabled={loading}
            >
              {loading ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Load Vault Status
            </Button>
          )}

          {/* Vault status */}
          {vault && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-muted rounded-lg px-3 py-2">
                  <p className="text-muted-foreground text-xs">Owner</p>
                  <p className="font-mono text-xs truncate">
                    {vault.owner || "Unknown"}
                  </p>
                </div>
                <div className="bg-muted rounded-lg px-3 py-2">
                  <p className="text-muted-foreground text-xs">Files</p>
                  <p className="font-bold">{vault.fileCount}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge
                  variant={vault.isAuthorized ? "default" : "destructive"}
                  className="text-xs"
                >
                  {vault.isAuthorized ? "Authorized" : "Not Authorized"}
                </Badge>
              </div>

              {/* File list */}
              {vault.files.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">
                    Stored Files
                  </p>
                  {vault.files.map((f, i) => (
                    <div
                      key={i}
                      className="bg-muted rounded-lg px-3 py-2 flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-xs font-mono truncate">
                        {f.ipfsHash}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Access Controls */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Data Sharing</p>
            <Input
              placeholder="researcher.testnet"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                disabled={!memberId || loading}
                onClick={() => {
                  onGrant(novaVaultId, memberId);
                  setMemberId("");
                }}
              >
                <UserPlus className="mr-1 h-4 w-4" />
                Grant
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                disabled={!memberId || loading}
                onClick={() => {
                  onRevoke(novaVaultId, memberId);
                  setMemberId("");
                }}
              >
                <UserMinus className="mr-1 h-4 w-4" />
                Revoke
              </Button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive font-medium">{error}</p>
          )}

          {/* Reset */}
          <Button variant="outline" className="w-full" onClick={onReset}>
            Start Over
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
