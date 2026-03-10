import { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Calendar, Users, Shield } from "lucide-react";

const sides = [
  {
    icon: Calendar,
    title: "ORGANISERS",
    description: "Create events, define fight cards, and fill slots with AI-assisted match suggestions. Manage your promotion end-to-end.",
  },
  {
    icon: Shield,
    title: "COACHES",
    description: "Manage your roster, review proposals, and approve matches. Full control over which fights your athletes take.",
  },
  {
    icon: Users,
    title: "FIGHTERS",
    description: "Build your profile, track your record, and confirm match proposals. Your career data in one place.",
  },
];

function NetworkLine({ containerRef }: { containerRef: React.RefObject<HTMLElement> }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);

  const { scrollYProgress } = useScroll({
    target: containerRef as React.RefObject<HTMLElement>,
    offset: ["start end", "end start"],
  });

  // Map scroll to 0–1 progress for line drawing
  const progress = useTransform(scrollYProgress, [0.1, 0.7], [0, 1]);
  const [currentProgress, setCurrentProgress] = useState(0);

  useEffect(() => {
    const unsubscribe = progress.on("change", (v) => {
      setCurrentProgress(Math.max(0, Math.min(1, v)));
    });
    return unsubscribe;
  }, [progress]);

  // Calculate node positions from card elements
  useEffect(() => {
    const updatePoints = () => {
      if (!containerRef.current || !svgRef.current) return;
      const cards = containerRef.current.querySelectorAll("[data-network-node]");
      const svgRect = svgRef.current.getBoundingClientRect();
      const newPoints: { x: number; y: number }[] = [];

      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        newPoints.push({
          x: rect.left + rect.width / 2 - svgRect.left,
          y: rect.top + rect.height / 2 - svgRect.top,
        });
      });

      if (newPoints.length === 3) setPoints(newPoints);
    };

    updatePoints();
    window.addEventListener("resize", updatePoints);
    // Re-measure after layout settles
    const timer = setTimeout(updatePoints, 500);
    return () => {
      window.removeEventListener("resize", updatePoints);
      clearTimeout(timer);
    };
  }, [containerRef]);

  if (points.length < 3) return <svg ref={svgRef} className="absolute inset-0 w-full h-full pointer-events-none" />;

  // Build path through all three nodes
  const pathD = `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y} L ${points[2].x} ${points[2].y}`;

  // Which segments are "connected" (each segment activates at 0–0.5 and 0.5–1)
  const seg1Progress = Math.min(1, currentProgress * 2);
  const seg2Progress = Math.max(0, (currentProgress - 0.5) * 2);

  // Node glow thresholds
  const node1Active = currentProgress > 0.05;
  const node2Active = currentProgress > 0.45;
  const node3Active = currentProgress > 0.85;

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      style={{ overflow: "visible" }}
    >
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Segment 1: Node 0 → Node 1 */}
      {seg1Progress > 0 && (
        <line
          x1={points[0].x}
          y1={points[0].y}
          x2={points[0].x + (points[1].x - points[0].x) * seg1Progress}
          y2={points[0].y + (points[1].y - points[0].y) * seg1Progress}
          stroke="hsl(46 93% 48%)"
          strokeWidth="1.5"
          strokeOpacity={0.4 + seg1Progress * 0.4}
          filter="url(#glow)"
        />
      )}

      {/* Segment 2: Node 1 → Node 2 */}
      {seg2Progress > 0 && (
        <line
          x1={points[1].x}
          y1={points[1].y}
          x2={points[1].x + (points[2].x - points[1].x) * seg2Progress}
          y2={points[1].y + (points[2].y - points[1].y) * seg2Progress}
          stroke="hsl(46 93% 48%)"
          strokeWidth="1.5"
          strokeOpacity={0.4 + seg2Progress * 0.4}
          filter="url(#glow)"
        />
      )}

      {/* Connection nodes */}
      {points.map((pt, i) => {
        const active = [node1Active, node2Active, node3Active][i];
        return (
          <g key={i}>
            {/* Outer glow ring */}
            <circle
              cx={pt.x}
              cy={pt.y}
              r={active ? 8 : 3}
              fill="none"
              stroke="hsl(46 93% 48%)"
              strokeWidth="1"
              strokeOpacity={active ? 0.3 : 0}
              style={{ transition: "all 0.4s ease-in-out" }}
            />
            {/* Core dot */}
            <circle
              cx={pt.x}
              cy={pt.y}
              r={active ? 4 : 2}
              fill="hsl(46 93% 48%)"
              fillOpacity={active ? 0.9 : 0.15}
              filter={active ? "url(#glow)" : undefined}
              style={{ transition: "all 0.4s ease-in-out" }}
            />
          </g>
        );
      })}
    </svg>
  );
}

export function ThreeSidesSection() {
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <section ref={sectionRef} className="py-16 sm:py-24 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/[0.03] blur-[100px]" />
      </div>

      <div className="container relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl text-foreground mb-3">
            THREE SIDES. <span className="text-primary">ONE PLATFORM.</span>
          </h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            MatchUp connects the three key roles in combat sports matchmaking into a single, streamlined workflow.
          </p>
        </motion.div>

        <div className="relative">
          {/* Network line SVG overlay */}
          <NetworkLine containerRef={sectionRef as React.RefObject<HTMLElement>} />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
            {sides.map((side, i) => (
              <motion.div
                key={side.title}
                data-network-node
                className="relative group rounded-lg border border-border bg-card p-8 transition-all duration-250 hover:border-primary/30 gold-glow-hover"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
              >
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10 border border-primary/20 mb-6 transition-all duration-250 group-hover:bg-primary/15 group-hover:border-primary/30">
                  <side.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-heading text-2xl text-foreground mb-3">{side.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{side.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
