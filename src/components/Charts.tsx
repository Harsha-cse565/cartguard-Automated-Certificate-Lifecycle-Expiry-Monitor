import React, { useState } from 'react';

// 1. Donut Chart for Risk Distribution
export const RiskDonutChart: React.FC<{
  data: Array<{ name: string; value: number; color: string }>;
}> = ({ data }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  if (total === 0) {
    return <div className="h-48 flex items-center justify-center text-xs text-slate-500">No data available</div>;
  }

  const radius = 64;
  const strokeWidth = 22;
  const center = 80;
  const circumference = 2 * Math.PI * radius;

  let accumulatedAngle = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
        <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
          {data.map((item, idx) => {
            const fraction = item.value / total;
            const strokeDasharray = `${fraction * circumference} ${circumference}`;
            const strokeDashoffset = -accumulatedAngle * circumference;
            accumulatedAngle += fraction;
            const isHovered = hoveredIdx === idx;

            return (
              <circle
                key={item.name}
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={item.color}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="butt"
                className="transition-all duration-200 cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold tracking-tight text-white tabular-nums font-mono">
            {hoveredIdx !== null ? data[hoveredIdx].value : total}
          </span>
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
            {hoveredIdx !== null ? data[hoveredIdx].name : 'Endpoints'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs w-full">
        {data.map((item, idx) => (
          <div
            key={item.name}
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
            className={`flex items-center justify-between p-2 rounded transition-colors cursor-pointer ${
              hoveredIdx === idx ? 'bg-slate-800/80 text-white' : 'text-slate-400 hover:bg-slate-900/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="font-medium text-slate-300">{item.name}</span>
            </div>
            <span className="tabular-nums font-mono font-semibold text-slate-200">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// 2. Expiry Timeline Horizontal/Vertical Bar Chart
export const ExpiryTimelineBarChart: React.FC<{
  data: Array<{ bucket: string; count: number }>;
}> = ({ data }) => {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  const getBucketColor = (bucket: string) => {
    if (bucket === 'Expired') return 'bg-red-500 hover:bg-red-400';
    if (bucket === '0–7 days') return 'bg-rose-500 hover:bg-rose-400';
    if (bucket === '8–14 days') return 'bg-orange-500 hover:bg-orange-400';
    if (bucket === '15–30 days') return 'bg-amber-500 hover:bg-amber-400';
    if (bucket === '31–90 days') return 'bg-sky-500 hover:bg-sky-400';
    return 'bg-emerald-500 hover:bg-emerald-400';
  };

  return (
    <div className="space-y-2.5">
      {data.map((item) => {
        const percent = Math.round((item.count / maxCount) * 100);
        return (
          <div key={item.bucket} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">{item.bucket}</span>
              <span className="font-mono text-slate-400 tabular-nums">{item.count} certs</span>
            </div>
            <div className="h-2 w-full bg-slate-800/80 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getBucketColor(item.bucket)}`}
                style={{ width: `${Math.max(percent, item.count > 0 ? 5 : 0)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// 3. Cipher Distribution Bar Chart
export const CipherDistributionBarChart: React.FC<{
  data: Array<{ name: string; count: number; fill: string }>;
}> = ({ data }) => {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="grid grid-cols-4 gap-2 pt-2">
      {data.map((item) => {
        const heightPct = Math.round((item.count / max) * 100);
        return (
          <div key={item.name} className="flex flex-col items-center gap-2">
            <div className="h-28 w-full bg-slate-900/60 rounded flex items-end justify-center p-1.5 border border-slate-800/60">
              <div
                className="w-full rounded-sm transition-all duration-500 flex items-center justify-center min-h-[4px]"
                style={{
                  height: `${Math.max(heightPct, 6)}%`,
                  backgroundColor: item.fill,
                }}
              >
                {item.count > 0 && (
                  <span className="text-[11px] font-mono font-bold text-slate-950 tabular-nums">
                    {item.count}
                  </span>
                )}
              </div>
            </div>
            <span className="text-[11px] font-medium text-slate-400 text-center">{item.name}</span>
          </div>
        );
      })}
    </div>
  );
};

// 4. Findings Timeline Chart (Trend line / area)
export const FindingsTrendChart: React.FC<{
  data: Array<{ date: string; critical: number; high: number; medium: number }>;
}> = ({ data }) => {
  if (!data || data.length === 0) return null;

  const height = 120;
  const width = 420;
  const paddingX = 35;
  const paddingY = 20;

  const maxVal = Math.max(
    ...data.map((d) => d.critical + d.high + d.medium),
    6
  );

  const getPoints = (accessor: (d: any) => number) => {
    return data
      .map((d, i) => {
        const x = paddingX + (i / (data.length - 1)) * (width - 2 * paddingX);
        const y = height - paddingY - (accessor(d) / maxVal) * (height - 2 * paddingY);
        return `${x},${y}`;
      })
      .join(' ');
  };

  const criticalPoints = getPoints((d) => d.critical);
  const highPoints = getPoints((d) => d.high);

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-28 overflow-visible">
        {/* Horizontal gridlines */}
        {[0, 0.5, 1].map((ratio) => {
          const y = height - paddingY - ratio * (height - 2 * paddingY);
          return (
            <line
              key={ratio}
              x1={paddingX}
              y1={y}
              x2={width - paddingX}
              y2={y}
              stroke="#334155"
              strokeDasharray="3 3"
              strokeWidth="0.75"
            />
          );
        })}

        {/* High severity line */}
        <polyline
          fill="none"
          stroke="#F97316"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={highPoints}
        />

        {/* Critical severity line */}
        <polyline
          fill="none"
          stroke="#EF4444"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={criticalPoints}
        />

        {/* Data points */}
        {data.map((d, i) => {
          const x = paddingX + (i / (data.length - 1)) * (width - 2 * paddingX);
          const yCrit = height - paddingY - (d.critical / maxVal) * (height - 2 * paddingY);
          return (
            <g key={i}>
              <circle cx={x} cy={yCrit} r="3" fill="#EF4444" stroke="#0F172A" strokeWidth="1.5" />
              <text
                x={x}
                y={height - 4}
                textAnchor="middle"
                fontSize="9"
                fill="#94A3B8"
                className="font-mono text-[9px]"
              >
                {d.date.split(' ')[0]}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex items-center justify-center gap-6 mt-1 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-0.5 bg-red-500 rounded" />
          <span>Critical Expiries</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-0.5 bg-orange-500 rounded" />
          <span>High Severity Risks</span>
        </div>
      </div>
    </div>
  );
};
