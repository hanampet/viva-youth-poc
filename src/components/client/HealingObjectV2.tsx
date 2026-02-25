import { motion } from 'framer-motion';
import { useSession } from '../../contexts/SessionContext';

export function HealingObjectV2() {
  const { orbState, isSessionActive } = useSession();

  const isActive = orbState === 'speaking' || orbState === 'listening';

  return (
    <div className="relative w-full h-full bg-white overflow-hidden">
      <div className="absolute inset-2 rounded-[1.5rem] overflow-hidden bg-gradient-to-b from-white to-slate-50">

        {/* Aurora container */}
        <div className="absolute bottom-0 left-0 right-0 h-full">

          {/* Layer 1: 베이스 - 진한 파랑 */}
          <motion.div
            key={`layer1-${isActive}`}
            className="absolute"
            style={{
              width: '250%',
              height: '120%',
              left: '-75%',
              bottom: '-30%',
              background: `
                radial-gradient(ellipse 60% 50% at 30% 80%, rgba(16,50,205,0.95) 0%, transparent 70%),
                radial-gradient(ellipse 50% 45% at 70% 85%, rgba(59,130,246,0.85) 0%, transparent 65%)
              `,
              filter: 'blur(50px)',
            }}
            animate={{
              x: isActive ? [-300, 300, -300] : [-80, 80, -80],
              y: isActive ? [0, -250, 0] : [0, -30, 0],
            }}
            transition={{
              x: { duration: isActive ? 9 : 18, repeat: Infinity, ease: 'easeInOut' },
              y: { duration: isActive ? 7.5 : 15, repeat: Infinity, ease: 'easeInOut' },
            }}
          />

          {/* Layer 2: 보라색 악센트 */}
          <motion.div
            key={`layer2-${isActive}`}
            className="absolute"
            style={{
              width: '220%',
              height: '100%',
              left: '-60%',
              bottom: '-20%',
              background: `
                radial-gradient(ellipse 55% 50% at 50% 85%, rgba(79,70,229,0.8) 0%, transparent 65%),
                radial-gradient(ellipse 40% 40% at 25% 80%, rgba(124,58,237,0.6) 0%, transparent 60%)
              `,
              filter: 'blur(45px)',
            }}
            animate={{
              x: isActive ? [250, -250, 250] : [60, -60, 60],
              y: isActive ? [-100, 200, -100] : [-20, 30, -20],
            }}
            transition={{
              x: { duration: isActive ? 7 : 14, repeat: Infinity, ease: 'easeInOut' },
              y: { duration: isActive ? 6 : 12, repeat: Infinity, ease: 'easeInOut' },
            }}
          />

          {/* Layer 3: 하이라이트 */}
          <motion.div
            key={`layer3-${isActive}`}
            className="absolute"
            style={{
              width: '180%',
              height: '80%',
              left: '-40%',
              bottom: '-10%',
              background: `
                radial-gradient(ellipse 70% 60% at 50% 90%, rgba(147,197,253,0.6) 0%, transparent 60%),
                radial-gradient(ellipse 50% 50% at 50% 85%, rgba(255,255,255,0.5) 0%, transparent 50%)
              `,
              filter: 'blur(35px)',
            }}
            animate={{
              x: isActive ? [-200, 200, -200] : [-40, 40, -40],
              y: isActive ? [0, -150, 0] : [0, -20, 0],
            }}
            transition={{
              x: { duration: isActive ? 5 : 10, repeat: Infinity, ease: 'easeInOut' },
              y: { duration: isActive ? 4 : 8, repeat: Infinity, ease: 'easeInOut' },
            }}
          />
        </div>

        {/* Status indicator */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 flex items-center gap-2">
          <motion.span
            className={`w-2 h-2 rounded-full ${isSessionActive ? 'bg-blue-600' : 'bg-gray-400'}`}
            animate={{
              opacity: isSessionActive ? [1, 0.4, 1] : 0.5,
              scale: isActive ? [1, 1.3, 1] : 1,
            }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span className="text-sm text-gray-500 font-medium">
            {isSessionActive ? 'Live' : 'Ready'}
          </span>
        </div>
      </div>
    </div>
  );
}
