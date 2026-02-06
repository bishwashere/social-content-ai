"use client";

import { useEffect, useId, useState } from "react";
import { STEPS, COLORS } from "./constants";
import { polarToCartesian, describeArc } from "./utils";

/**
 * Circular flow diagram for landing page "How it works" section.
 * Renders: top arrow "Describe your product" + 4-step circular loop.
 * Responsive, SVG-based, minimal colors (brand + neutral).
 */
export function CircularFlowDiagram() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const padding = isMobile ? 170 : 120;
  const width = 360 + padding * 2;
  const height = 520;
  const cx = width / 2;
  const cy = 330;
  const r = 100;
  const maxStrokeWidth = 4;
  const rArc = r - maxStrokeWidth / 2; // Offset inward by half stroke width
  const arrowLength = 22.5;
  const halfArrowAngleDeg = (arrowLength / 2 / rArc) * (180 / Math.PI); // Backward offset along tangent
  const labelRadius = r + 48;
  const step2Pos = polarToCartesian(cx, cy, labelRadius, 270);
  const step2TopY = step2Pos.y - 47;
  const step1ConnectorTopY = 72;
  const step1ConnectorBottomY = step2TopY;
  const step1ConnectorMidY = step1ConnectorTopY + (step1ConnectorBottomY - step1ConnectorTopY) * 0.7;

  const id = useId();
  const markerId = `circular-flow-arrow-${id.replace(/:/g, "")}`;
  const gradientId = `flow-gradient-${id.replace(/:/g, "")}`;
  const step2GradientId = `step2-gradient-${id.replace(/:/g, "")}`;
  const glowFilterId = `glow-${id.replace(/:/g, "")}`;
  const step2GlowFilterId = `step2-glow-${id.replace(/:/g, "")}`;
  const markerThickId = `circular-flow-arrow-thick-${id.replace(/:/g, "")}`;
  const entryGradientId = `entry-gradient-${id.replace(/:/g, "")}`;

  return (
    <div className="circular-flow-diagram w-full min-w-0 max-w-full sm:max-w-md md:max-w-xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl mx-0 sm:mx-auto px-[1px] sm:px-4 [&_svg]:text-[32px] sm:[&_svg]:text-[32px] md:[&_svg]:text-[16px] lg:[&_svg]:text-[17px] xl:[&_svg]:text-[18px]">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto min-h-[280px] sm:min-h-[320px] md:min-h-[360px]"
        preserveAspectRatio="xMidYMid meet"
        aria-label="How NextPost AI works: describe your product, then AI generates campaign, plans and posts, analyzes performance, and iterates"
        style={{ textRendering: "optimizeLegibility", shapeRendering: "geometricPrecision" }}
      >
        <defs>
          <filter id={glowFilterId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={step2GlowFilterId} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Arrow: ref at center (rotates around center), aligned to tangent, base on circle */}
          <marker
            id={markerId}
            markerWidth="25"
            markerHeight="25"
            refX={arrowLength / 2}
            refY="7.5"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path d="M0,0 L0,15 L22.5,7.5 z" fill={COLORS.primary} />
          </marker>
          <marker
            id={markerThickId}
            markerWidth="35"
            markerHeight="35"
            refX="30"
            refY="10"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path d="M0,0 L0,20 L30,10 z" fill={`url(#${entryGradientId})`} />
          </marker>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={COLORS.primary} />
            <stop offset="100%" stopColor={COLORS.cyan} />
          </linearGradient>
          <linearGradient id={entryGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
          {/* Same gradient as .gradient-text-accent: #7c3aed → #06b6d4 */}
          <linearGradient id={step2GradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>

        {/* Step 1: Describe your product - reduced weight, quick input feel */}
        <g>
          <text
            x={cx}
            y={34}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{
              fontSize: "0.95em",
              fill: "#a78bfa",
              fontWeight: 700,
              fontFamily: "inherit",
              textRendering: "optimizeLegibility",
            }}
          >
            Step 1
          </text>
          <rect
            x={cx + 32}
            y={26}
            width={84}
            height={14}
            rx={7}
            fill="rgba(59, 130, 246, 0.12)"
            stroke="rgba(59, 130, 246, 0.4)"
            strokeWidth="1"
          />
          <text
            x={cx + 74}
            y={33}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fontSize: "0.65em", fill: "#64748b", fontWeight: 500, textRendering: "optimizeLegibility" }}
          >
            You do this
          </text>
          <text
            x={cx}
            y={56}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#cbd5e1" 
            style={{ fontSize: "0.9em" }}
          >
            Describe your product
          </text>
          <path
            d={`M ${cx} ${step1ConnectorTopY} L ${cx} ${step1ConnectorMidY - 8}`}
            fill="none"
            stroke={COLORS.primary}
            strokeWidth="4"
            strokeLinecap="round"
            opacity={0.9}
          />
          <polygon
            points={`${cx - 7},${step1ConnectorMidY - 3} ${cx + 7},${step1ConnectorMidY - 3} ${cx},${step1ConnectorMidY + 9}`}
            fill={`url(#${entryGradientId})`}
            filter={`url(#${step2GlowFilterId})`}
          />
          <path
            d={`M ${cx} ${step1ConnectorMidY + 16} L ${cx} ${step1ConnectorBottomY}`}
            fill="none"
            stroke={COLORS.primary}
            strokeWidth="4"
            strokeLinecap="round"
            opacity={0.9}
          />
        </g>

        {/* Solid connector from Step 2 to circle — "powered by" visual link */}
        <path
          d={`M ${cx} ${step2Pos.y + 28} L ${cx} ${cy - rArc - 5}`}
          fill="none"
          stroke={`url(#${entryGradientId})`}
          strokeWidth="3"
          strokeLinecap="butt"
          opacity={0.9}
        />

        {/* Circle outline — subtle track for the loop */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={COLORS.neutralDark}
          strokeWidth="1"
          opacity={0.25}
        />

        {/* Circular loop: arcs at rArc, arrows at exact positions (Top: 270°, Right: 0°, Bottom: 90°, Left: 180°) */}
        <g>
          <path
            d={describeArc(cx, cy, rArc, 270, 360 - halfArrowAngleDeg)}
            fill="none"
            stroke={`url(#${entryGradientId})`}
            strokeWidth="4"
            strokeLinecap="butt"
            markerEnd={`url(#${markerId})`}
            filter={`url(#${step2GlowFilterId})`}
          />
          <path
            d={describeArc(cx, cy, rArc, 0, 90 - halfArrowAngleDeg)}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="2"
            strokeLinecap="butt"
            markerEnd={`url(#${markerId})`}
            opacity={0.7}
          />
          <path
            d={describeArc(cx, cy, rArc, 90, 180 - halfArrowAngleDeg)}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="2"
            strokeLinecap="butt"
            markerEnd={`url(#${markerId})`}
            opacity={0.7}
          />
          <path
            d={describeArc(cx, cy, rArc, 180, 270 - halfArrowAngleDeg)}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="2"
            strokeLinecap="butt"
            markerEnd={`url(#${markerId})`}
            opacity={0.7}
          />
        </g>

        {/* Step labels at 12, 3, 6, 9 o'clock - multi-line with step numbers and badges */}
        {STEPS.map(({ step, angle, badge, badgeSide, lines }) => {
          const pos = polarToCartesian(cx, cy, labelRadius, angle);
          const isLeft = angle === 180;
          const isRight = angle === 0;
          const isBottom = angle === 90;
          const isStep2 = angle === 270; // Primary highlight — the engine (top)
          const lineHeight = isStep2 ? 20 : 14;
          const lineGap = "1.15em";
          const badgeHeight = 16;
          const badgeWidth = 72;
          const stepNumWidth = 48;
          const gap = 8;
          const stepNumY = isBottom
            ? pos.y - 14 - lineHeight - 4
            : pos.y - (lines.length - 1) * (lineHeight / 2) - 14 - lineHeight - 4;
          const lineY = stepNumY;
          const contentY = stepNumY + lineHeight + 6;
          const stepNumX = pos.x;
          const badgeX =
            badgeSide === "right"
              ? stepNumX +
              (isRight ? stepNumWidth : stepNumWidth / 2) +
              gap +
              badgeWidth / 2
              : stepNumX - stepNumWidth - gap - badgeWidth / 2;
          const badgeColor = (badge as string) === "You do this" ? COLORS.badgeYou : COLORS.badgeAi;
          const badgeBg = (badge as string) === "You do this" ? COLORS.badgeYouBg : COLORS.badgeAiBg;
          const badgeTextColor = (badge as string) === "You do this" ? "#93c5fd" : "#86efac";
          const isAutomationStep = !isStep2;
          return (
            <g key={angle}>
              <text
                x={stepNumX}
                y={lineY}
                textAnchor={
                  isLeft ? "end" : isRight ? "start" : "middle"
                }
                dominantBaseline="middle"
                style={{
                  fontSize: "0.95em",
                  fill: "#a78bfa",
                  fontWeight: 700,
                  fontFamily: "inherit",
                  textRendering: "optimizeLegibility",
                }}
              >
                Step {step}
              </text>
              <rect
                x={isLeft ? badgeX - badgeWidth : badgeX - 20}
                y={lineY - 8}
                width={badgeWidth + 20}
                height={badgeHeight}
                rx={badgeHeight / 2}
                fill={"rgba(34, 197, 94, 0.12)"}
                stroke={"rgba(34, 197, 94, 0.35)"}
                strokeWidth="1"
                opacity={isAutomationStep ? 0.9 : 1}
              />
              <text
                x={isLeft ? badgeX - 20 : badgeX + 25}
                y={lineY}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[15px] sm:text-[15px] md:text-[14px] lg:text-[12px] xl:text-[12px]"
                style={{
                  fill: badgeTextColor,
                  fontWeight: isStep2 ? 600 : 500,
                  fontFamily: "inherit",
                  textRendering: "optimizeLegibility",
                }}
              >
                {badge}
              </text>
              <text
                x={pos.x}
                y={contentY}
                textAnchor={
                  isLeft ? "end" : isRight ? "start" : "middle"
                }
                dominantBaseline={isBottom ? "hanging" : "middle"}
                style={{
                  fontSize: "0.95em",
                  fontWeight: 500,
                  fontFamily: "inherit",
                  textRendering: "optimizeLegibility",
                }}
              >
                {/* {isStep2 ? (
                    <>
                      <tspan x={pos.x} dy={0} fill={`url(#${step2GradientId})`}>
                        NextPost AI generates
                      </tspan>
                      <tspan x={pos.x} dy={lineGap} fill={`url(#${step2GradientId})`}>
                        your campaign
                      </tspan>
                    </>
                  ) : ( */}
                {/* ))
                  )} */}
                {lines.map((line, i) => (
                  <tspan
                    key={i}
                    x={pos.x}
                    dy={i === 0 ? 0 : lineGap}
                    fill="#cbd5e1"
                    style={{ fontSize: "0.9em" }}
                  >
                    {line}
                  </tspan>))}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
