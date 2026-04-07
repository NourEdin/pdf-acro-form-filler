import type { Branch } from '../types'

interface BranchSelectorProps {
  value: Branch
  onChange: (b: Branch) => void
  disabled?: boolean
}

export function BranchSelector({
  value,
  onChange,
  disabled,
}: BranchSelectorProps) {
  return (
    <fieldset className="branch-fieldset" disabled={disabled}>
      <legend className="branch-legend">Contract type</legend>
      <div className="branch-options">
        <label className="branch-option">
          <input
            type="radio"
            name="branch"
            checked={value === 'local'}
            onChange={() => onChange('local')}
          />
          <span>Local</span>
        </label>
        <label className="branch-option">
          <input
            type="radio"
            name="branch"
            checked={value === 'international'}
            onChange={() => onChange('international')}
          />
          <span>International</span>
        </label>
      </div>
    </fieldset>
  )
}
