import { HealingObject } from '../client/HealingObject';

export function ClientView() {

  return (
    <div className="w-1/2 flex flex-col items-center justify-center bg-gradient-to-b from-surface-50 via-white to-surface-50 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary-100/50 blur-3xl" />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center">
        <HealingObject />
      </div>

      {/* User view label */}
      <div className="absolute bottom-4 left-4 text-surface-400 text-sm">
        사용자 화면
      </div>
    </div>
  );
}
