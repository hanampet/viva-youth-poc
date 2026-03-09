import { useState } from 'react';
import { HealingObject } from '../client/HealingObject';
import { HealingObjectV2 } from '../client/HealingObjectV2';
import { useSession } from '../../contexts/SessionContext';

type ViewStyle = 'orb' | 'aurora';

export function ClientView() {
  const { isDebugMode, addLog } = useSession();
  const [viewStyle, setViewStyle] = useState<ViewStyle>('orb');

  return (
    <div className={`${isDebugMode ? 'w-1/2' : 'w-full'} flex flex-col relative overflow-hidden`}>
      {viewStyle === 'orb' ? (
        // Style 1: Orb (원형 오브제)
        <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-surface-50 via-white to-surface-50 relative">
          {/* Background ambient glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary-100/50 blur-3xl" />
          </div>

          {/* Main content */}
          <div className="relative z-10 flex flex-col items-center">
            <HealingObject />
          </div>
        </div>
      ) : (
        // Style 2: Aurora (Gemini 스타일)
        <HealingObjectV2 />
      )}

      {/* Style toggle - bottom left (디버그 모드에서만 표시) */}
      {isDebugMode && (
        <div className="absolute bottom-4 left-4 flex items-center gap-3 z-20">
          <span className="text-xs text-gray-400">스타일:</span>
          <div className="flex gap-1 bg-black/30 backdrop-blur-sm rounded-lg p-1">
            <button
              onClick={() => { setViewStyle('orb'); addLog('SYSTEM', '스타일 변경: Orb'); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                viewStyle === 'orb'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Orb
            </button>
            <button
              onClick={() => { setViewStyle('aurora'); addLog('SYSTEM', '스타일 변경: Aurora'); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                viewStyle === 'aurora'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Aurora
            </button>
          </div>
        </div>
      )}

      {/* User view label (디버그 모드에서만 표시) */}
      {isDebugMode}
    </div>
  );
}
