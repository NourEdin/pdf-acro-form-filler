import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useMemo } from 'react'
import { z } from 'zod'
import {
  definitionsForBranch,
  fieldDefinitions,
} from '../config/form-config'
import { salalahCanonicalFieldOrder } from '../config/manifest'
import type { Branch } from '../types'

function buildSchema(keys: readonly string[]) {
  const shape: Record<string, z.ZodString> = {}
  for (const k of keys) {
    shape[k] = z.string()
  }
  return z.object(shape)
}

function emptyDefaults(keys: readonly string[]): Record<string, string> {
  return Object.fromEntries(keys.map((k) => [k, ''])) as Record<string, string>
}

function randomToken(): string {
  return Math.random().toString(36).slice(2, 10)
}

function randomFieldValue(multiline?: boolean): string {
  if (multiline) {
    return `Lorem ${randomToken()}\nLine two ${randomToken()}\n${randomToken()}`
  }
  return `Sample ${randomToken()}`
}

interface ContractFormProps {
  branch: Branch
  onSubmit: (values: Record<string, string>) => void
  isSubmitting: boolean
}

export function ContractForm({
  branch,
  onSubmit,
  isSubmitting,
}: ContractFormProps) {
  const editableKeys = useMemo(
    () => fieldDefinitions.filter((d) => !d.readOnly).map((d) => d.formKey),
    [],
  )

  const schema = useMemo(() => buildSchema(editableKeys), [editableKeys])

  const defaults = useMemo(() => emptyDefaults(editableKeys), [editableKeys])

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<Record<string, string>>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  })

  const visible = definitionsForBranch(branch)

  function fillRandomData(): void {
    for (const def of visible) {
      setValue(def.formKey, randomFieldValue(def.multiline), {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })
    }
  }

  return (
    <form
      className="contract-form"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <div className="form-scroll">
        {visible.map((def) => {
          const err = errors[def.formKey]?.message
          const commonProps = {
            id: def.formKey,
            ...register(def.formKey),
            className: 'form-input',
            disabled: isSubmitting,
            'aria-invalid': err ? true : undefined,
            'aria-describedby': err ? `${def.formKey}-err` : undefined,
          }
          return (
            <div key={def.formKey} className="form-row">
              <label className="form-label" htmlFor={def.formKey}>
                {def.label}
              </label>
              {def.multiline ? (
                <textarea
                  {...commonProps}
                  className="form-input form-textarea"
                  rows={3}
                />
              ) : (
                <input type="text" {...commonProps} autoComplete="off" />
              )}
              {err ? (
                <p id={`${def.formKey}-err`} className="form-error" role="alert">
                  {String(err)}
                </p>
              ) : null}
            </div>
          )
        })}
      </div>
      <p className="form-meta">
        {visible.length} of {salalahCanonicalFieldOrder.length} fields shown for
        this contract type. Configure visibility in{' '}
        <code>form-config.ts</code>.
      </p>
      <div className="form-actions">
        <button
          type="button"
          className="btn secondary"
          disabled={isSubmitting}
          onClick={fillRandomData}
        >
          Fill with random data
        </button>
        <button type="submit" className="btn primary" disabled={isSubmitting}>
          {isSubmitting ? 'Generating PDFs…' : 'Submit and generate PDFs'}
        </button>
      </div>
    </form>
  )
}
