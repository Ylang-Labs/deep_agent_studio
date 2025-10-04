import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Loader2Icon,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export const ToolFallback: ToolCallMessagePartComponent = ({
  toolName,
  argsText,
  result,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const isAwaitingResult = result === undefined || result === null;
  const statusIcon = isAwaitingResult ? (
    <Loader2Icon className="aui-tool-fallback-icon size-4 animate-spin" />
  ) : (
    <CheckIcon className="aui-tool-fallback-icon size-4" />
  );

  const renderedResult = (
    <div className="aui-tool-fallback-result-root border-t border-dashed px-4 pt-2">
      <p className="aui-tool-fallback-result-header font-semibold">Result:</p>
      {isAwaitingResult ? (
        <div className="aui-tool-fallback-result-pending flex items-center gap-2 text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" aria-hidden />
          <span className="aui-tool-fallback-result-pending-text text-sm">
            Waiting for tool response...
          </span>
        </div>
      ) : (
        <pre className="aui-tool-fallback-result-content whitespace-pre-wrap">
          {typeof result === "string" ? result : JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
  return (
    <div className="aui-tool-fallback-root mb-4 flex w-full flex-col gap-3 rounded-lg border py-3">
      <div className="aui-tool-fallback-header flex items-center gap-2 px-4">
        {statusIcon}
        <p className="aui-tool-fallback-title flex-grow">
          Used tool: <b>{toolName}</b>
        </p>
        <Button onClick={() => setIsCollapsed(!isCollapsed)}>
          {isCollapsed ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </Button>
      </div>
      {!isCollapsed && (
        <div className="aui-tool-fallback-content flex flex-col gap-2 border-t pt-2">
          <div className="aui-tool-fallback-args-root px-4">
            <pre className="aui-tool-fallback-args-value whitespace-pre-wrap">
              {argsText}
            </pre>
          </div>
          {renderedResult}
        </div>
      )}
    </div>
  );
};
