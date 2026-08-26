import type { ReactNode } from "react";

export const Card = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`rounded-xl border border-rule bg-card ${className}`}>{children}</div>
);

export const Label = ({ children }: { children: ReactNode }) => (
  <span className="mb-1.5 block text-xs font-medium tracking-wide text-ink-soft uppercase">
    {children}
  </span>
);

export const fieldClass =
  "w-full rounded-lg border border-rule bg-card px-3 py-2 text-sm text-ink outline-none focus:border-accent";

type SelectProps<T extends string> = {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  hint?: string;
};

export const Select = <T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
}: SelectProps<T>) => (
  <label className="block">
    <Label>{label}</Label>
    <select
      className={fieldClass}
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    {hint ? <span className="mt-1 block text-xs text-ink-soft">{hint}</span> : null}
  </label>
);

export const Button = ({
  children,
  onClick,
  disabled,
  variant = "primary",
  className = "",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "ghost" | "danger";
  className?: string;
  type?: "button" | "submit";
}) => {
  const styles = {
    primary: "bg-accent text-white hover:opacity-90",
    ghost: "border border-rule text-ink hover:border-accent",
    danger: "border border-flag text-flag hover:bg-flag-soft",
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-40 ${styles} ${className}`}
    >
      {children}
    </button>
  );
};
