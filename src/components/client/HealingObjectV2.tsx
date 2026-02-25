import { motion } from 'framer-motion';
import { useSession } from '../../contexts/SessionContext';

export function HealingObjectV2() {
  const { orbState, currentVolume, isSessionActive } = useSession();

  // 볼륨/상태에 따른 강도
  const intensity = isSessionActive
    ? orbState === 'speaking'
      ? 1.5 + currentVolume * 0.8
      : 1
    : 0.7;

  const speed = orbState === 'speaking' ? 0.4 : 1;

  return (
    <div className="relative w-full h-full bg-[#0a0a0c] overflow-hidden">
      {/* Inner rounded container - Gemini style */}
      <div className="absolute inset-2 rounded-[1.5rem] overflow-hidden bg-[#0d0d10]">
        {/* Aurora glow container */}
        <div className="absolute bottom-0 left-0 right-0 h-[60%]">
          {/* Layer 1: Main bright teal base */}
          <motion.div
            className="absolute"
            style={{
              width: '140%',
              height: '100%',
              left: '-20%',
              bottom: '-30%',
              background: `
                radial-gradient(ellipse 60% 50% at 50% 90%, rgba(34,211,238,1) 0%, rgba(34,211,238,0.6) 25%, rgba(34,211,238,0.2) 50%, transparent 70%)
              `,
              filter: 'blur(20px)',
            }}
            animate={{
              x: [0, 25 * intensity, -20 * intensity, 15 * intensity, 0],
              y: [0, -10 * intensity, 8 * intensity, -6 * intensity, 0],
            }}
            transition={{ duration: 6 * speed, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Layer 2: Left cyan blob */}
          <motion.div
            className="absolute"
            style={{
              width: '80%',
              height: '90%',
              left: '-10%',
              bottom: '-20%',
              background: `
                radial-gradient(ellipse 70% 60% at 30% 85%, rgba(56,189,248,0.95) 0%, rgba(56,189,248,0.4) 35%, transparent 65%)
              `,
              filter: 'blur(15px)',
            }}
            animate={{
              x: [0, 40 * intensity, -25 * intensity, 30 * intensity, 0],
              y: [0, -15 * intensity, 12 * intensity, -10 * intensity, 0],
              scale: [1, 1.08, 0.95, 1.05, 1],
            }}
            transition={{ duration: 7 * speed, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Layer 3: Right blue blob */}
          <motion.div
            className="absolute"
            style={{
              width: '85%',
              height: '85%',
              left: '25%',
              bottom: '-15%',
              background: `
                radial-gradient(ellipse 65% 55% at 70% 88%, rgba(14,165,233,0.9) 0%, rgba(14,165,233,0.35) 40%, transparent 70%)
              `,
              filter: 'blur(18px)',
            }}
            animate={{
              x: [0, -35 * intensity, 30 * intensity, -20 * intensity, 0],
              y: [0, 12 * intensity, -18 * intensity, 10 * intensity, 0],
              scale: [1, 0.95, 1.1, 0.98, 1],
            }}
            transition={{ duration: 8 * speed, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          />

          {/* Layer 4: Center bright highlight */}
          <motion.div
            className="absolute"
            style={{
              width: '70%',
              height: '70%',
              left: '15%',
              bottom: '-10%',
              background: `
                radial-gradient(ellipse 80% 70% at 50% 95%, rgba(103,232,249,0.8) 0%, rgba(34,211,238,0.3) 40%, transparent 70%)
              `,
              filter: 'blur(12px)',
            }}
            animate={{
              x: [0, 20 * intensity, -30 * intensity, 25 * intensity, 0],
              y: [0, -8 * intensity, 15 * intensity, -12 * intensity, 0],
            }}
            transition={{ duration: 5 * speed, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
          />

          {/* Layer 5: Subtle purple accent */}
          <motion.div
            className="absolute"
            style={{
              width: '60%',
              height: '50%',
              left: '30%',
              bottom: '5%',
              background: `
                radial-gradient(ellipse 50% 40% at 55% 80%, rgba(139,92,246,0.4) 0%, transparent 60%)
              `,
              filter: 'blur(25px)',
            }}
            animate={{
              x: [0, -20 * intensity, 25 * intensity, -15 * intensity, 0],
              opacity: [0.4, 0.6, 0.3, 0.5, 0.4],
            }}
            transition={{ duration: 9 * speed, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          />

          {/* Layer 6: White highlights */}
          <motion.div
            className="absolute"
            style={{
              width: '40%',
              height: '35%',
              left: '20%',
              bottom: '10%',
              background: 'radial-gradient(ellipse 60% 50% at 50% 80%, rgba(255,255,255,0.25) 0%, transparent 60%)',
              filter: 'blur(10px)',
            }}
            animate={{
              x: [0, 30, -20, 15, 0],
              y: [0, -10, 8, -5, 0],
              opacity: [0.25, 0.4, 0.2, 0.35, 0.25],
            }}
            transition={{ duration: 4 * speed, repeat: Infinity, ease: 'easeInOut' }}
          />

          <motion.div
            className="absolute"
            style={{
              width: '35%',
              height: '30%',
              left: '50%',
              bottom: '15%',
              background: 'radial-gradient(ellipse 55% 45% at 50% 85%, rgba(255,255,255,0.2) 0%, transparent 55%)',
              filter: 'blur(12px)',
            }}
            animate={{
              x: [0, -25, 20, -10, 0],
              opacity: [0.2, 0.35, 0.15, 0.3, 0.2],
            }}
            transition={{ duration: 5 * speed, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          />

          {/* Edge glow at top of aurora */}
          <motion.div
            className="absolute"
            style={{
              width: '120%',
              height: '40%',
              left: '-10%',
              bottom: '35%',
              background: 'radial-gradient(ellipse 100% 50% at 50% 100%, rgba(34,211,238,0.3) 0%, transparent 60%)',
              filter: 'blur(20px)',
            }}
            animate={{
              opacity: [0.3, 0.5, 0.25, 0.45, 0.3],
            }}
            transition={{ duration: 4 * speed, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        {/* Speaking pulse waves */}
        {orbState === 'speaking' && currentVolume > 0.1 && (
          <div className="absolute bottom-[25%] left-1/2 -translate-x-1/2">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={`pulse-${i}`}
                className="absolute rounded-full"
                style={{
                  width: '180px',
                  height: '50px',
                  left: '-90px',
                  top: '-25px',
                  border: '1.5px solid rgba(103,232,249,0.5)',
                }}
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 1.6 + i * 0.25, opacity: 0 }}
                transition={{ duration: 1, delay: i * 0.15, repeat: Infinity }}
              />
            ))}
          </div>
        )}

        {/* Status indicator - top center */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 flex items-center gap-2">
          <motion.span
            className={`w-2 h-2 rounded-full ${
              isSessionActive ? 'bg-cyan-400' : 'bg-gray-500'
            }`}
            animate={{
              opacity: isSessionActive ? [1, 0.4, 1] : 0.5,
              scale: orbState === 'speaking' ? [1, 1.3, 1] : 1,
            }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span className="text-sm text-gray-400 font-medium">
            {isSessionActive ? 'Live' : 'Ready'}
          </span>
        </div>
      </div>
    </div>
  );
}
