import { motion } from 'framer-motion';
import { useSession } from '../../contexts/SessionContext';

// Style 1: ChatGPT Voice Mode 스타일 - 흰색 배경 + 하늘색 수채화 구름
function CloudOrb({ orbState, currentVolume, isSessionActive }: OrbProps) {
  // 구체 스케일 변화 (5px ≈ 2.5% of 192px)
  const getScale = () => {
    if (orbState === 'speaking') return 1 + currentVolume * 0.18 + 0.03;
    if (orbState === 'listening' && currentVolume > 0.1) return 1 + currentVolume * 0.1;
    return 1;
  };

  // Speaking 상태에서 빠르지만 부드러운 움직임
  const speed = orbState === 'speaking' ? 0.5 : 1;
  const intensity = isSessionActive
    ? (orbState === 'speaking' ? 1.2 : 0.6)
    : 0.3;

  return (
    <motion.div
      className="relative w-48 h-48"
      animate={{ scale: getScale() }}
      transition={{ type: 'spring', stiffness: 150, damping: 15 }}
    >
      {/* Main white orb */}
      <div
        className="absolute inset-0 rounded-full overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 50%, #e8f4ff 100%)',
          boxShadow: '0 4px 40px rgba(59,130,246,0.3), 0 0 0 1px rgba(59,130,246,0.15)',
        }}
      >
        {/* Cloud layer 1 - 하단 메인 파란 구름 */}
        <motion.div
          className="absolute"
          style={{
            width: '200%',
            height: '150%',
            left: '-50%',
            top: '10%',
            background: `
              radial-gradient(ellipse 40% 35% at 50% 70%, rgba(59,130,246,0.75) 0%, rgba(59,130,246,0.35) 30%, transparent 60%),
              radial-gradient(ellipse 35% 30% at 30% 60%, rgba(96,165,250,0.7) 0%, rgba(96,165,250,0.25) 35%, transparent 55%)
            `,
            filter: 'blur(16px)',
          }}
          animate={{
            x: [0, 12 * intensity, -8 * intensity, 10 * intensity, 0],
            y: [0, -6 * intensity, 5 * intensity, -4 * intensity, 0],
            scale: [1, 1.03, 0.98, 1.02, 1],
          }}
          transition={{ duration: 6 * speed, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Cloud layer 2 - 중앙 진한 파란 구름 */}
        <motion.div
          className="absolute"
          style={{
            width: '180%',
            height: '140%',
            left: '-40%',
            top: '0%',
            background: `
              radial-gradient(ellipse 45% 40% at 55% 55%, rgba(37,99,235,0.65) 0%, rgba(37,99,235,0.25) 35%, transparent 60%),
              radial-gradient(ellipse 30% 35% at 70% 45%, rgba(59,130,246,0.6) 0%, rgba(59,130,246,0.2) 40%, transparent 55%)
            `,
            filter: 'blur(18px)',
          }}
          animate={{
            x: [0, -10 * intensity, 14 * intensity, -8 * intensity, 0],
            y: [0, 8 * intensity, -6 * intensity, 10 * intensity, 0],
            scale: [1, 0.97, 1.04, 0.98, 1],
          }}
          transition={{ duration: 7 * speed, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        />

        {/* Cloud layer 3 - 좌측 파란 구름 */}
        <motion.div
          className="absolute"
          style={{
            width: '160%',
            height: '130%',
            left: '-60%',
            top: '-10%',
            background: `
              radial-gradient(ellipse 50% 45% at 40% 50%, rgba(96,165,250,0.6) 0%, rgba(96,165,250,0.2) 40%, transparent 65%)
            `,
            filter: 'blur(20px)',
          }}
          animate={{
            x: [0, 15 * intensity, -6 * intensity, 10 * intensity, 0],
            y: [0, -5 * intensity, 8 * intensity, -6 * intensity, 0],
            scale: [1, 1.02, 0.97, 1.01, 1],
          }}
          transition={{ duration: 8 * speed, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />

        {/* Cloud layer 4 - 우측 하단 진한 구름 */}
        <motion.div
          className="absolute"
          style={{
            width: '140%',
            height: '120%',
            left: '10%',
            top: '20%',
            background: `
              radial-gradient(ellipse 40% 35% at 60% 65%, rgba(37,99,235,0.55) 0%, rgba(37,99,235,0.18) 40%, transparent 60%)
            `,
            filter: 'blur(22px)',
          }}
          animate={{
            x: [0, -12 * intensity, 8 * intensity, -10 * intensity, 0],
            y: [0, 6 * intensity, -8 * intensity, 5 * intensity, 0],
            scale: [1, 1.02, 0.96, 1.03, 1],
          }}
          transition={{ duration: 6.5 * speed, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
        />

        {/* Cloud layer 5 - 상단 연한 하늘색 */}
        <motion.div
          className="absolute"
          style={{
            width: '150%',
            height: '100%',
            left: '-25%',
            top: '-30%',
            background: `
              radial-gradient(ellipse 60% 40% at 50% 30%, rgba(147,197,253,0.5) 0%, rgba(191,219,254,0.25) 40%, transparent 70%)
            `,
            filter: 'blur(14px)',
          }}
          animate={{
            x: [0, 8 * intensity, -10 * intensity, 5 * intensity, 0],
            y: [0, 5 * intensity, -4 * intensity, 6 * intensity, 0],
            opacity: [0.6, 0.8, 0.55, 0.75, 0.6],
          }}
          transition={{ duration: 7 * speed, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
        />

        {/* Breathing center glow - 숨쉬는 중앙 글로우 */}
        <motion.div
          className="absolute"
          style={{
            width: '120%',
            height: '120%',
            left: '-10%',
            top: '-10%',
            background: 'radial-gradient(circle at 50% 55%, rgba(59,130,246,0.5) 0%, rgba(59,130,246,0.15) 30%, transparent 55%)',
            filter: 'blur(12px)',
          }}
          animate={{
            scale: orbState === 'speaking' ? [1, 1.15, 1] : [1, 1.06, 1],
            opacity: orbState === 'speaking' ? [0.5, 0.8, 0.5] : [0.4, 0.55, 0.4],
          }}
          transition={{ duration: 3 * speed, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Top white fade - 상단 흰색 그라데이션 */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.35) 25%, transparent 50%)',
          }}
        />
      </div>

      {/* Speaking pulse ring */}
      {orbState === 'speaking' && currentVolume > 0.1 && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            border: '1.5px solid rgba(59,130,246,0.5)',
          }}
          initial={{ scale: 1, opacity: 0.6 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
}

interface OrbProps {
  orbState: string;
  currentVolume: number;
  isSessionActive: boolean;
}

export function HealingObject() {
  const { orbState, currentVolume, isSessionActive } = useSession();

  return (
    <div className="relative flex flex-col items-center">
      {/* Orb container */}
      <div className="relative w-64 h-64 flex items-center justify-center">
        {/* Outer glow ring */}
        <motion.div
          className="absolute rounded-full border border-primary-300/20"
          style={{
            width: '300px',
            height: '300px',
          }}
          animate={{
            scale: orbState === 'speaking' ? [1, 1.03, 1] : 1,
            opacity: isSessionActive ? [0.3, 0.5, 0.3] : 0.2,
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        <CloudOrb orbState={orbState} currentVolume={currentVolume} isSessionActive={isSessionActive} />

        {/* State indicator */}
        <div className="absolute -bottom-2 flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              orbState === 'speaking'
                ? 'bg-green-500'
                : orbState === 'listening'
                  ? 'bg-primary-500 animate-pulse'
                  : orbState === 'thinking'
                    ? 'bg-yellow-500 animate-pulse'
                    : 'bg-surface-400'
            }`}
          />
          <span className="text-xs text-surface-600 uppercase font-medium">
            {orbState === 'speaking'
              ? '말하는 중'
              : orbState === 'listening'
                ? '듣는 중'
                : orbState === 'thinking'
                  ? '생각 중'
                  : '대기'}
          </span>
        </div>
      </div>
    </div>
  );
}
