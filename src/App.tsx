import { HashRouter, Route, Routes } from 'react-router-dom'
import { ContractPrefillerApp } from './features/contract-prefiller/components/ContractPrefillerApp'
import './contract-prefiller.css'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<ContractPrefillerApp />} />
      </Routes>
    </HashRouter>
  )
}
