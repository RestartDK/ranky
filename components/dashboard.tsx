"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CloudArrowUp, FileText } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

const STEP_LABELS = {
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

type PipelineStep = keyof typeof STEP_LABELS;

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

export function Dashboard() {
  const router = useRouter();
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [personaText, setPersonaText] = useState("");
  const [step, setStep] = useState<PipelineStep>("idle");
  const [csvDragOver, setCsvDragOver] = useState(false);

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

    function simulateProgress() {
      const steps: PipelineStep[] = [
        "normalising_leads",
        "hard_rules",
        "llm_ranking",
      ];
      let index = 0;
      const interval = window.setInterval(() => {
        if (index >= steps.length) {
          window.clearInterval(interval);
          return;
        }

        setStep(steps[index]);
        index += 1;
      }, 8000);

      return interval;
    }

    const progressInterval = simulateProgress();

    try {
      const formData = new FormData();
      formData.append("csv", csvFile);
      formData.append("persona", personaText);

      setStep("normalising_persona");

      const response = await fetch("/api/rank", {
        method: "POST",
        body: formData,
      });

      window.clearInterval(progressInterval);

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || "Pipeline failed");
      }

      const { jobId } = await response.json();

      setStep("done");
      toast.success("Ranking complete!");
      router.push(`/results/${jobId}`);
    } catch (error) {
      window.clearInterval(progressInterval);
      setStep("error");
      toast.error(
        error instanceof Error ? error.message : "Something went wrong",
      );
    }
  }, [csvFile, personaText, router]);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-3xl space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
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
                onDragOver={(event) => {
                  event.preventDefault();
                  setCsvDragOver(true);
                }}
                onDragLeave={() => setCsvDragOver(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setCsvDragOver(false);

                  const file = event.dataTransfer.files[0];
                  if (file?.name.endsWith(".csv")) {
                    setCsvFile(file);
                    return;
                  }

                  toast.error("Please drop a .csv file");
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
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    setCsvFile(file);
                  }
                }}
                disabled={isProcessing}
              />
            </CardContent>
          </Card>

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
                onChange={(event) => setPersonaText(event.target.value)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();

                  const file = event.dataTransfer.files[0];
                  if (!file) {
                    return;
                  }

                  const reader = new FileReader();
                  reader.onload = ({ target }) => {
                    if (typeof target?.result === "string") {
                      setPersonaText(target.result);
                    }
                  };
                  reader.readAsText(file);
                }}
                disabled={isProcessing}
                className="flex-1 resize-y overflow-y-auto text-xs field-sizing-fixed"
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {isProcessing && (
            <Card>
              <CardContent className="space-y-3 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{STEP_LABELS[step]}</span>
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
  );
}
