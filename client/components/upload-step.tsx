"use client";

import { Heart, Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface UploadStepProps {
  date: string;
  userId: string;
  useFilePath: boolean;
  loading: boolean;
  error: string | null;
  onDateChange: (date: string) => void;
  onUserIdChange: (id: string) => void;
  onToggleFilePath: (use: boolean) => void;
  onFileRead: (content: string) => void;
  onAnalyze: () => void;
}

export function UploadStep({
  date,
  userId,
  useFilePath,
  loading,
  error,
  onDateChange,
  onUserIdChange,
  onToggleFilePath,
  onFileRead,
  onAnalyze,
}: UploadStepProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onFileRead(reader.result as string);
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex justify-center px-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
              <Heart className="h-7 w-7 text-emerald-500" />
            </div>
          </div>
          <CardTitle className="text-2xl">Proof of Pulse</CardTitle>
          <CardDescription>
            Generate a cryptographic proof of your workout from Apple Watch
            heart rate data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Data source toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Data Source</label>
            <div className="flex gap-2">
              <Button
                variant={useFilePath ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => onToggleFilePath(true)}
              >
                <FileText className="mr-2 h-4 w-4" />
                Demo Data
              </Button>
              <Button
                variant={!useFilePath ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => onToggleFilePath(false)}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload XML
              </Button>
            </div>
            {useFilePath && (
              <p className="text-xs text-muted-foreground">
                Using server-side data/export.xml
              </p>
            )}
          </div>

          {/* File upload (if not using demo data) */}
          {!useFilePath && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Apple Health Export (XML)
              </label>
              <Input
                type="file"
                accept=".xml"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
            </div>
          )}

          {/* Date picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Workout Date</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
            />
          </div>

          {/* User ID */}
          <div className="space-y-2">
            <label className="text-sm font-medium">NEAR Account ID</label>
            <Input
              type="text"
              value={userId}
              onChange={(e) => onUserIdChange(e.target.value)}
              placeholder="your-account.testnet"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive font-medium">{error}</p>
          )}

          {/* Submit */}
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            size="lg"
            onClick={onAnalyze}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent inline-block" />
                Analyzing...
              </>
            ) : (
              "Generate Proof"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
