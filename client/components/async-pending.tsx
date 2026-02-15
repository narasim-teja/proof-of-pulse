"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Clock, Zap } from "lucide-react";
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
    timerRef.current = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);

    intervalRef.current = setInterval(async () => {
      setPollCount((c) => c + 1);
      try {
        const status = await api.getRequestStatus(requestId);
        if (status === null) {
          toast.success("Oracle fulfilled your request");
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
    <section className="px-6 sm:px-10 py-16 sm:py-20">
      <div className="max-w-4xl mx-auto">
        <div className="section-label mb-4">Async Attestation</div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
          {/* Terminal header */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-neutral-800">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-500 animate-pulse" />
            <span className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
            <span className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
            <span className="font-mono text-[10px] text-neutral-600 ml-2">
              yield-resume-listener
            </span>
          </div>

          <div className="p-5 space-y-5">
            {/* Request ID */}
            <div className="space-y-1">
              <div className="font-mono text-[10px] text-neutral-600 uppercase tracking-wider">
                Request ID
              </div>
              <span className="font-mono text-sm text-neutral-300">
                {requestId}
              </span>
            </div>

            {/* Status badges */}
            <div className="flex flex-wrap gap-2 font-mono text-xs">
              <span className="border border-cyan-900/50 px-3 py-1 rounded text-cyan-400 flex items-center gap-1.5">
                <Zap className="h-3 w-3" />
                Yield/Resume
              </span>
              <span className="border border-neutral-800 px-3 py-1 rounded text-neutral-500 flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                {elapsed}s elapsed
              </span>
            </div>

            {/* Polling status */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-mono text-xs text-neutral-400">
                <Loader2 className="h-3 w-3 animate-spin text-cyan-500" />
                Polling contract for fulfillment... (check #{pollCount})
              </div>
              <p className="font-mono text-xs text-neutral-600 leading-relaxed">
                The Shade Agent polls for pending requests every 30 seconds and
                submits the attestation result back on-chain. This may take up
                to 60 seconds.
              </p>
            </div>

            {/* Cancel */}
            <button
              onClick={onReset}
              className="font-mono text-xs text-neutral-400 border border-neutral-800 px-5 py-2 rounded-full hover:border-neutral-600 hover:text-white transition-colors"
            >
              Cancel &amp; Start Over
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
