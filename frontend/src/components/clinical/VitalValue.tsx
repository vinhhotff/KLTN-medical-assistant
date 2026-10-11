import React from 'react';
import { Missing } from '../ui';
import { hasVital } from '../../utils/vitals';

interface VitalValueProps {
  value: unknown;
  unit?: string;
  className?: string;
}

/** Shows a measured vital sign with its unit, or "— Chưa đo" when it was not recorded. */
export const VitalValue: React.FC<VitalValueProps> = ({ value, unit, className }) => {
  if (!hasVital(value)) return <Missing label="Chưa đo" />;
  return (
    <span className={className}>
      {String(value)}
      {unit && <span className="text-[10px] font-normal text-slate-500 ml-0.5">{unit}</span>}
    </span>
  );
};
