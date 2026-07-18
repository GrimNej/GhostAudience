import { EMPTY_INTENT_CONTRACT } from "@ghost-audience/domain";
import { useNavigate, useParams } from "react-router-dom";
import { useAnalysisController } from "../../analysis/data/use-analysis-controller";
import { useCapabilities } from "../../analysis/data/use-capabilities";
import { useIntentActions } from "../../intent/data/use-intent-actions";
import {
  fromIntentContract,
  type IntentFormValue,
} from "../../intent/domain/intent-form";
import { useProject } from "../../project/presentation/useProject";
import { useScriptActions } from "../data/use-script-actions";
import { ScriptEditor } from "./ScriptEditor";

export function ScriptPage(): JSX.Element {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const controller = useAnalysisController();
  const capabilities = useCapabilities();

  if (projectId === undefined) {
    throw new Error("Content route is missing projectId.");
  }
  const requiredProjectId = projectId;

  const value = useProject(projectId);
  const scriptActions = useScriptActions(projectId);
  const intentActions = useIntentActions(projectId);

  if (value === undefined || capabilities.isLoading) {
    return (
      <div className="loading-state" aria-busy="true">
        Preparing your workspace...
      </div>
    );
  }
  if (value === null) return <p>Project not found.</p>;

  const capability = capabilities.data;
  const liveAvailable =
    capability?.liveAnalysisEnabled === true &&
    capability.providerMode === "watsonx" &&
    capability.modelId !== null &&
    capability.tokenBudget.remainingBeforeHardStop > 0;
  const fixtureAvailable = capability?.fixtureModeAvailable ?? true;
  const analysisDisabled = !liveAvailable && !fixtureAvailable;
  const providerMode = liveAvailable ? "watsonx" : "fixture";
  const modelId = liveAvailable ? (capability?.modelId ?? "") : "fixture-v1";

  async function analyze(
    title: string,
    text: string,
    fileName: string | null,
    context: IntentFormValue,
  ): Promise<void> {
    const saved = await scriptActions.save(title, text, fileName);
    await intentActions.save(context);
    await controller.start({
      projectId: requiredProjectId,
      providerMode,
      modelId,
      promptVersion: providerMode === "fixture" ? "fixture-v1" : "step-v1",
    });
    await navigate(`/project/${requiredProjectId}/analyze`, {
      state: { scriptId: saved.id },
    });
  }

  return (
    <ScriptEditor
      key={value.script?.id ?? value.project.id}
      initialTitle={value.script?.title ?? ""}
      initialText={value.script?.normalizedText ?? ""}
      initialContext={fromIntentContract(
        value.project.intentContract ?? EMPTY_INTENT_CONTRACT,
      )}
      disabled={analysisDisabled}
      analysisLabel="Analyze my content"
      analysisHint={
        liveAvailable
          ? "Uses your connected audience model and opens the results when ready."
          : fixtureAvailable
            ? "Live analysis is unavailable, so this will run a local preview."
            : "Analysis is temporarily unavailable."
      }
      onAnalyze={analyze}
    />
  );
}
