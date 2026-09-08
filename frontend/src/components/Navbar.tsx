import { Link, useLocation } from 'react-router-dom'
import { Terminal } from 'lucide-react'

export default function Navbar() {
  const setup = useLocation().pathname === '/setup'
  return <header className="topbar">
    <Link to="/" className="brand"><Terminal size={20} /> dorado <span>Rust 练习室</span></Link>
    <nav className="primary-nav" aria-label="主导航">
      <Link to="/" aria-current={!setup ? 'page' : undefined}>学习</Link>
      <Link to="/setup" aria-current={setup ? 'page' : undefined}>环境部署</Link>
    </nav>
  </header>
}
