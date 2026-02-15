"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import * as api from "@/lib/api";

interface AsyncPendingProps {
  requestId: string;
  onFulfilled: () => void;
  onReset: () => void;
}

export function AsyncPending({
  requestId,
  onFulfilled,
  onReset,
}: AsyncPendingProps) {
  const [elapsed, setElapsed] = useState(0);
  const [pollCount, setPollCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Elapsed timer
    timerRef.current = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);

    // Poll for fulfillment every 5 seconds
    intervalRef.current = setInterval(async () => {
      setPollCount((c) => c + 1);
      try {
        const status = await api.getRequestStatus(requestId);
        // If request is gone from pending (null), it was fulfilled
        if (status === null) {
          onFulfilled();
        }
      } catch {
        // Ignore poll errors, keep trying
      }
    }, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [requestId, onFulfilled]);

  return (
    <div className="flex justify-center px-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500/20">
              <Loader2 className="h-8 w-8 text-cyan-500 animate-spin" />
            </div>
          </div>
          <CardTitle className="text-2xl">Awaiting Oracle Fulfillment</CardTitle>
          <CardDescription>
            Your attestation request is on-chain. The TEE oracle will process it
            automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Request ID */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">
              Request ID
            </label>
            <div className="bg-muted rounded-lg px-3 py-2">
              <span className="text-sm font-mono">{requestId}</span>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-cyan-400 border-cyan-400/30">
              <Zap className="mr-1 h-3 w-3" />
              Async (Yield/Resume)
            </Badge>
            <Badge variant="outline" className="text-muted-foreground">
              <Clock className="mr-1 h-3 w-3" />
              {elapsed}s elapsed
            </Badge>
          </div>

          {/* Progress info */}
          <div className="bg-muted rounded-lg px-3 py-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
              <span className="text-muted-foreground">
                Polling contract for fulfillment... (check #{pollCount})
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              The Shade Agent polls for pending requests every 30 seconds and
              submits the attestation result back on-chain. This may take up to
              60 seconds.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-2">
            <Button variant="outline" className="w-full" onClick={onReset}>
              Cancel & Start Over
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
