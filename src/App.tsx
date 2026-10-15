import { useState } from 'react'
import './App.css'
import { createDefaultBoard } from './board/defaultBoard'
import { Pitch } from './components/Pitch'

export default function App() {
  const [board] = useState(createDefaultBoard)
  return (
    <main className="app">
      <h1 className="visually-hidden">Gegenboard</h1>
      <div className="stage">
        <Pitch board={board} />
      </div>
    </main>
  )
}
