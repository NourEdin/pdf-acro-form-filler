import { HashRouter, Route, Routes } from 'react-router-dom'
import { ContractPrefillerApp } from './features/contract-prefiller/components/ContractPrefillerApp'
import { FieldInspector } from './features/contract-prefiller/FieldInspector'
import './contract-prefiller.css'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<ContractPrefillerApp />} />
        <Route path="/dev/fields" element={<FieldInspector />} />
      </Routes>
    </HashRouter>
  )
}
