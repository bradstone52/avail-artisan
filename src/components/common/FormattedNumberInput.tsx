import { useState, useEffect, useCallback, forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { formatNumberInput, parseFormattedNumber } from '@/lib/format';

interface FormattedNumberInputProps {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  placeholder?: string;
  className?: string;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export const FormattedNumberInput = forwardRef<HTMLInputElement, FormattedNumberInputProps>(
  function FormattedNumberInput({
    value,
    onChange,
    placeholder,
    className,
    prefix,
    suffix,
    min,
    max,
    disabled,
  }, ref) {
    const [displayValue, setDisplayValue] = useState('');

    useEffect(() => {
      setDisplayValue(formatNumberInput(value));
    }, [value]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      
      // Allow empty input
      if (!raw) {
        setDisplayValue('');
        onChange(null);
        return;
      }

      // Only allow numbers, commas, and one decimal point
      const cleaned = raw.replace(/[^0-9.,]/g, '');
      setDisplayValue(cleaned);

      const parsed = parseFormattedNumber(cleaned);
      if (parsed !== null) {
        let finalValue = parsed;
        if (min !== undefined && parsed < min) finalValue = min;
        if (max !== undefined && parsed > max) finalValue = max;
        onChange(finalValue);
      }
    }, [onChange, min, max]);

    const handleBlur = useCallback(() => {
      // Format on blur
      setDisplayValue(formatNumberInput(value));
    }, [value]);

    return (
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {prefix}
          </span>
        )}
        <Input
          ref={ref}
          type="text"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`${prefix ? 'pl-7' : ''} ${suffix ? 'pr-12' : ''} ${className || ''}`}
          disabled={disabled}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            {suffix}
          </span>
        )}
      </div>
    );
  }
);
