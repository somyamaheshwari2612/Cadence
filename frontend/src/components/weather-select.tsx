import * as Select from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';

type WeatherSelectProps = {
  label: string;
  value: string;
  options: string[];
  onValueChange?: (value: string) => void;
  variant?: 'period' | 'location' | 'field';
  displayOptions?: Record<string, string>;
};

export function WeatherSelect({ label, value, options, onValueChange = () => {}, variant = 'period', displayOptions = {} }: WeatherSelectProps) {
  return <Select.Root value={value} onValueChange={onValueChange}>
    <Select.Trigger aria-label={label} className={`weather-select-trigger weather-select-${variant}`}>
      <Select.Value />
      <Select.Icon asChild><ChevronDown aria-hidden="true" /></Select.Icon>
    </Select.Trigger>
    <Select.Portal>
      <Select.Content position="popper" sideOffset={7} collisionPadding={12} className="weather-select-menu">
        <Select.Viewport className="weather-select-options">
          {options.map(option => <Select.Item value={option} key={option} className="weather-select-option">
            <Select.ItemText>{displayOptions[option] ?? option}</Select.ItemText>
            <Select.ItemIndicator className="weather-select-check"><Check aria-hidden="true" /></Select.ItemIndicator>
          </Select.Item>)}
        </Select.Viewport>
      </Select.Content>
    </Select.Portal>
  </Select.Root>;
}