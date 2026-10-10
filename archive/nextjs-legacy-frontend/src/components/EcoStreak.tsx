"use client";

import { useState } from "react";
import { verifyTaskImage, VerifyTaskResponse } from "@/utils/apiClient";
import { Camera, CheckCircle2, XCircle, HelpCircle, Flame, Sparkles, RefreshCw } from "lucide-react";

export default function EcoStreak() {
  const [streakCount, setStreakCount] = useState(3);
  const [taskName, setTaskName] = useState("Water a home or community plant");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VerifyTaskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Image file is too large. Please upload an image under 5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setResult(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleVerify = async () => {
    if (!selectedImage) return;

    try {
      setIsVerifying(true);
      setError(null);
      const res = await verifyTaskImage(selectedImage, taskName);
      setResult(res);

      if (res.status === "verified") {
        setStreakCount((prev) => prev + 1);
      }
    } catch (err: any) {
      setError(err.message || "Failed to verify task image");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="glass-panel rounded-2xl p-6 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-emerald-500/10">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-lime-500 flex items-center justify-center text-obsidian-950 font-bold shadow-md shadow-emerald-500/20">
            <Flame className="h-4 w-4 fill-obsidian-950" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-emerald-100 tracking-wide">Eco-Streak Action</h3>
            <span className="text-[10px] text-emerald-400/80">Daily Verified Environmental Habit</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs font-bold font-mono">
          <Flame className="h-3.5 w-3.5 fill-emerald-400 text-emerald-400" />
          <span>{streakCount} Days</span>
        </div>
      </div>

      {/* Daily Challenge Card */}
      <div className="p-4 rounded-xl bg-obsidian-950/80 border border-emerald-500/15 space-y-2">
        <span className="text-[10px] uppercase font-mono font-semibold text-emerald-400 block tracking-wider">
          Today&apos;s Action Challenge
        </span>
        <p className="text-sm font-medium text-white">{taskName}</p>
        <span className="text-[11px] text-emerald-400/80 block">
          Snap a photo completing this action to extend your habit streak.
        </span>
      </div>

      {/* Capture Input or Image Preview */}
      {!selectedImage ? (
        <label className="border-2 border-dashed border-emerald-500/20 hover:border-emerald-500/50 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-obsidian-950/40 group">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageCapture}
            className="hidden"
          />
          <div className="h-12 w-12 rounded-2xl bg-obsidian-900 group-hover:bg-emerald-950/70 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:text-emerald-300 transition-colors mb-3">
            <Camera className="h-6 w-6" />
          </div>
          <span className="text-xs font-medium text-emerald-200 group-hover:text-white">
            Take photo or upload image proof
          </span>
          <span className="text-[10px] text-emerald-400/70 mt-1">
            Rear camera preferred (PNG or JPEG, &lt; 5MB)
          </span>
        </label>
      ) : (
        <div className="space-y-4">
          <div className="relative rounded-xl overflow-hidden border border-emerald-500/20 aspect-video bg-obsidian-950 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedImage}
              alt="Uploaded task proof"
              className="max-h-full max-w-full object-contain"
            />
          </div>

          {!result ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleVerify}
                disabled={isVerifying}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 hover:from-emerald-500 hover:to-emerald-300 text-obsidian-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isVerifying ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-obsidian-950 border-t-transparent rounded-full animate-spin"></div>
                    <span>Gemini Vision Assessing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Verify with Gemini Vision</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={isVerifying}
                className="px-3.5 py-2.5 rounded-xl bg-obsidian-900 hover:bg-emerald-950/80 text-emerald-300 text-xs border border-emerald-500/20 transition-colors"
              >
                Retake
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleReset}
              className="w-full py-2.5 rounded-xl bg-obsidian-900 hover:bg-emerald-950/80 text-emerald-200 text-xs font-medium border border-emerald-500/20 transition-colors flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Capture Another Action</span>
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/20 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* Distinct Decision Card */}
      {result && (
        <div
          className={`p-4 rounded-xl border space-y-2 text-xs ${
            result.status === "verified"
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
              : result.status === "not_verified"
              ? "bg-rose-950/40 border-rose-500/40 text-rose-200"
              : "bg-amber-950/40 border-amber-500/40 text-amber-200"
          }`}
        >
          <div className="flex items-center gap-2 font-semibold text-sm">
            {result.status === "verified" && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
            {result.status === "not_verified" && <XCircle className="h-4 w-4 text-rose-400" />}
            {result.status === "inconclusive" && <HelpCircle className="h-4 w-4 text-amber-400" />}
            <span className="capitalize">{result.status.replace("_", " ")}</span>
          </div>

          <p className="leading-relaxed">{result.user_message}</p>

          {result.model_assessment?.scene_description && (
            <div className="pt-2 border-t border-emerald-500/10 text-[11px] text-emerald-400/80">
              <strong className="text-emerald-200">Observation: </strong>
              {result.model_assessment.scene_description}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
