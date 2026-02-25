import { StateFlowIndicator } from '../operator/StateFlowIndicator';
import { ChatLog } from '../operator/ChatLog';
import { DebugConsole } from '../operator/DebugConsole';
import { ControlPanel } from '../operator/ControlPanel';

export function OperatorView() {
  return (
    <div className="w-1/2 flex flex-col border-l border-surface-200 bg-white">
      {/* State Flow Indicator */}
      <StateFlowIndicator />

      {/* Chat and Debug split */}
      <div className="flex-1 flex flex-col min-h-0">
        <ChatLog />
        <DebugConsole />
      </div>

      {/* Control Panel */}
      <ControlPanel />
    </div>
  );
}
