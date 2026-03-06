import { useSession } from '../../contexts/SessionContext';
import { SESSION_STAGES, getStageInfo } from '../../constants/sessionStages';

export function StateFlowIndicator() {
  const { stage, setStage, isSessionActive } = useSession();
  const currentInfo = getStageInfo(stage);

  return (
    <div className="p-4 border-b border-surface-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-surface-700">세션 진행</h3>
        <span className="text-xs text-surface-500">
          {currentInfo.order + 1} / {SESSION_STAGES.length}
        </span>
      </div>

      {/* Subway line style indicator */}
      <div className="relative">
        {/* Line */}
        <div className="absolute top-3 left-3 right-3 h-1 bg-surface-200 rounded-full" />
        <div
          className="absolute top-3 left-3 h-1 bg-primary-500 rounded-full transition-all duration-500"
          style={{
            width: `calc(${(currentInfo.order / (SESSION_STAGES.length - 1)) * 100}% - 24px)`,
          }}
        />

        {/* Stations */}
        <div className="relative flex justify-between">
          {SESSION_STAGES.map((stageInfo) => {
            const isActive = stageInfo.id === stage;
            const isPast = stageInfo.order < currentInfo.order;
            const isClickable = isSessionActive && stageInfo.order <= currentInfo.order + 1;

            return (
              <button
                key={stageInfo.id}
                onClick={() => isClickable && setStage(stageInfo.id)}
                disabled={!isClickable}
                className="flex flex-col items-center group"
                title={stageInfo.description}
              >
                {/* Station dot */}
                <div
                  className={`w-6 h-6 rounded-full border-3 flex items-center justify-center transition-all duration-300 ${
                    isActive
                      ? 'bg-primary-500 border-primary-500 shadow-lg shadow-primary-500/30'
                      : isPast
                        ? 'bg-primary-500 border-primary-500'
                        : 'bg-white border-surface-300'
                  } ${isClickable && !isActive ? 'cursor-pointer group-hover:border-primary-400' : ''} ${
                    !isClickable ? 'cursor-not-allowed' : ''
                  }`}
                >
                  {isActive && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                  {isPast && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>

                {/* Station label */}
                <span
                  className={`mt-2 text-xs font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'text-primary-600'
                      : isPast
                        ? 'text-primary-500'
                        : 'text-surface-400'
                  }`}
                >
                  {stageInfo.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
