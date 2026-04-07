import { Link } from 'react-router-dom'
import {
  acroformManifest,
  salalahCanonicalFieldOrder,
  sifahFieldOrder,
  TEMPLATE_FILES,
} from './config/manifest'
import type { Branch } from './types'

function orderArray(branch: Branch, venue: 'salalah' | 'sifah'): string[] {
  if (venue === 'salalah') {
    return salalahCanonicalFieldOrder
  }
  return sifahFieldOrder(branch)
}

export function FieldInspector() {
  const intlSalalah = orderArray('international', 'salalah')
  const intlSifah = orderArray('international', 'sifah')
  const locSifah = orderArray('local', 'sifah')

  const mismatchedSlots: number[] = []
  for (let i = 0; i < salalahCanonicalFieldOrder.length; i++) {
    if (intlSalalah[i] !== intlSifah[i]) mismatchedSlots.push(i)
  }

  return (
    <div className="inspector">
      <header className="prefiller-header">
        <h1>AcroForm field inspector</h1>
        <p className="prefiller-lede">
          Build-time manifest: {acroformManifest.length} templates. Slot mapping
          uses index alignment between venues (see plan).
        </p>
        <nav className="prefiller-nav">
          <Link to="/">← Back to prefiller</Link>
        </nav>
      </header>

      <section className="inspector-summary">
        <h2>Templates</h2>
        <ul>
          <li>{TEMPLATE_FILES.salalah.local}</li>
          <li>{TEMPLATE_FILES.salalah.international}</li>
          <li>{TEMPLATE_FILES.sifah.local}</li>
          <li>{TEMPLATE_FILES.sifah.international}</li>
        </ul>
        <p>
          International Salalah vs Sifah: {mismatchedSlots.length} indices use
          different AcroForm names (values still map by slot index).
        </p>
      </section>

      <div className="inspector-table-wrap">
        <table className="inspector-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Canonical (Salalah intl)</th>
              <th>Sifah intl</th>
              <th>Sifah local</th>
            </tr>
          </thead>
          <tbody>
            {salalahCanonicalFieldOrder.map((name, i) => (
              <tr
                key={name}
                className={
                  name !== intlSifah[i] ? 'inspector-row-diff' : undefined
                }
              >
                <td>{i}</td>
                <td>{name}</td>
                <td>{intlSifah[i]}</td>
                <td>{locSifah[i]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
