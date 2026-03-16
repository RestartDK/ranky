"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { authClient } from "@/lib/auth-client";
import {
  ArrowRight,
  CloudArrowUp,
  FileText,
} from "@phosphor-icons/react";

type PipelineStep =
  | "idle"
  | "uploading"
  | "parsing"
  | "normalising_persona"
  | "normalising_leads"
  | "hard_rules"
  | "llm_ranking"
  | "done"
  | "error";

const STEP_LABELS: Record<PipelineStep, string> = {
  idle: "",
  uploading: "Uploading files…",
  parsing: "Parsing CSV…",
  normalising_persona: "Normalising persona spec with AI…",
  normalising_leads: "Normalising leads with AI…",
  hard_rules: "Applying hard rule filters…",
  llm_ranking: "Running AI scoring & ranking…",
  done: "Complete!",
  error: "Failed",
};

const STEP_PROGRESS: Record<PipelineStep, number> = {
  idle: 0,
  uploading: 5,
  parsing: 10,
  normalising_persona: 20,
  normalising_leads: 40,
  hard_rules: 60,
  llm_ranking: 80,
  done: 100,
  error: 0,
};

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [personaText, setPersonaText] = useState("");
  const [step, setStep] = useState<PipelineStep>("idle");
  const [csvDragOver, setCsvDragOver] = useState(false);

  const handlePersonaDrop = useCallback((e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text === "string") setPersonaText(text);
    };
    reader.readAsText(file);
  }, []);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/sign-in");
    }
  }, [isPending, session, router]);

  const isProcessing = !["idle", "done", "error"].includes(step);

  const handleSubmit = useCallback(async () => {
    if (!csvFile) {
      toast.error("Please upload a CSV file");
      return;
    }
    if (!personaText.trim()) {
      toast.error("Please provide a persona spec");
      return;
    }

    setStep("uploading");

    try {
      const formData = new FormData();
      formData.append("csv", csvFile);
      formData.append("persona", personaText);

      setStep("normalising_persona");

      const simulateProgress = () => {
        const steps: PipelineStep[] = [
          "normalising_leads",
          "hard_rules",
          "llm_ranking",
        ];
        let i = 0;
        const interval = setInterval(() => {
          if (i < steps.length) {
            setStep(steps[i]!);
            i++;
          } else {
            clearInterval(interval);
          }
        }, 8000);
        return interval;
      };

      const progressInterval = simulateProgress();

      const res = await fetch("/api/rank", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Pipeline failed");
      }

      const { jobId } = await res.json();

      setStep("done");
      toast.success("Ranking complete!");

      router.push(`/results/${jobId}`);
    } catch (error) {
      setStep("error");
      const msg = error instanceof Error ? error.message : "Something went wrong";
      toast.error(msg);
    }
  }, [csvFile, personaText, router]);

  if (isPending || !session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-3xl space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* CSV Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CloudArrowUp className="size-4" />
                  Leads CSV
                </CardTitle>
                <CardDescription>
                  Upload a CSV with lead data (name, title, company, etc.)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Label
                  htmlFor="csv-upload"
                  className={`flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed p-6 transition-colors ${
                    csvDragOver
                      ? "border-primary bg-primary/5"
                      : csvFile
                        ? "border-primary/40 bg-primary/5"
                        : "border-border hover:border-muted-foreground/40"
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setCsvDragOver(true);
                  }}
                  onDragLeave={() => setCsvDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setCsvDragOver(false);
                    const file = e.dataTransfer.files[0];
                    if (file?.name.endsWith(".csv")) setCsvFile(file);
                    else toast.error("Please drop a .csv file");
                  }}
                >
                  {csvFile ? (
                    <>
                      <FileText className="size-8 text-primary" weight="duotone" />
                      <span className="text-sm font-medium">{csvFile.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {(csvFile.size / 1024).toFixed(1)} KB
                      </span>
                    </>
                  ) : (
                    <>
                      <CloudArrowUp className="size-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Drop CSV here or click to browse
                      </span>
                    </>
                  )}
                </Label>
                <input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setCsvFile(file);
                  }}
                  disabled={isProcessing}
                />
              </CardContent>
            </Card>

            {/* Persona Spec */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="size-4" />
                  Persona Spec
                </CardTitle>
                <CardDescription>
                  Drop a .md/.txt file or paste the persona specification
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <Textarea
                  placeholder="Paste or drop your persona/ICP spec here…"
                  value={personaText}
                  onChange={(e) => setPersonaText(e.target.value)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handlePersonaDrop}
                  disabled={isProcessing}
                  className="flex-1 resize-y overflow-y-auto text-xs field-sizing-fixed"
                />
              </CardContent>
            </Card>
          </div>

          {/* Progress / Submit */}
          <div className="space-y-4">
            {isProcessing && (
              <Card>
                <CardContent className="space-y-3 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {STEP_LABELS[step]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {STEP_PROGRESS[step]}%
                    </span>
                  </div>
                  <Progress value={STEP_PROGRESS[step]} className="h-1.5" />
                </CardContent>
              </Card>
            )}

            <Button
              onClick={handleSubmit}
              disabled={isProcessing || !csvFile}
              size="lg"
              className="w-full"
            >
              {isProcessing ? (
                "Processing…"
              ) : (
                <>
                  Start Ranking
                  <ArrowRight className="size-4" data-icon="inline-end" />
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
