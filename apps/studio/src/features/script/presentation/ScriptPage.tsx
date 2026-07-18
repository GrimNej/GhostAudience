import { useNavigate, useParams } from "react-router-dom";
import { useProject } from "../../project/presentation/useProject";
import { useScriptActions } from "../data/use-script-actions";
import { ScriptEditor } from "./ScriptEditor";

export function ScriptPage(): JSX.Element {
  const { projectId } = useParams();
  const navigate = useNavigate();
  if (projectId === undefined) {
    throw new Error("Script route is missing projectId.");
  }
  const value = useProject(projectId);
  const actions = useScriptActions(projectId);

  if (value === undefined) {
    return <div aria-busy="true">Loading script…</div>;
  }
  if (value === null) {
    return <p>Project not found.</p>;
  }

  return (
    <ScriptEditor
      initialTitle={value.script?.title ?? value.project.name}
      initialText={value.script?.normalizedText ?? ""}
      disabled={false}
      onSave={async (title, text) => {
        await actions.save(title, text);
        await navigate(`/project/${projectId}/intent`);
      }}
    />
  );
}
