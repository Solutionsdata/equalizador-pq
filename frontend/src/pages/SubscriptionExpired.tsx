import { BarChart3, RefreshCw, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const HOTMART_URL = 'https://pay.hotmart.com/SEU_LINK_AQUI'   // ← trocar pelo link real

export default function SubscriptionExpired() {
  const { logout } = useAuth()
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden text-center">
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-8 pt-8 pb-6">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BarChart3 size={26} className="text-white" />
            </div>
            <h1 className="text-white text-xl font-bold">Assinatura encerrada</h1>
            <p className="text-slate-400 text-sm mt-1">Seu acesso ao Equalizador PQ expirou</p>
          </div>

          <div className="px-8 py-7">
            <p className="text-gray-600 text-sm leading-relaxed mb-6">
              Para continuar usando a plataforma, renove sua assinatura. Você mantém
              todos os seus projetos e dados — basta reativar o acesso.
            </p>

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6">
              <div className="flex justify-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-black text-blue-700">R$ 49,90</p>
                  <p className="text-xs text-blue-500 font-medium">por mês</p>
                </div>
                <div className="w-px bg-blue-200" />
                <div className="text-center">
                  <p className="text-2xl font-black text-indigo-700">R$ 499,90</p>
                  <p className="text-xs text-indigo-500 font-medium">por ano <span className="bg-indigo-100 px-1.5 py-0.5 rounded-full font-bold">-17%</span></p>
                </div>
              </div>
            </div>

            <a
              href={HOTMART_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3.5 rounded-xl text-sm hover:opacity-90 transition-all mb-3"
            >
              <RefreshCw size={15} /> Renovar assinatura
            </a>

            <button
              onClick={logout}
              className="flex items-center justify-center gap-2 w-full text-gray-400 hover:text-gray-600 text-sm py-2 transition-colors"
            >
              <LogOut size={14} /> Sair da conta
            </button>
          </div>
        </div>

        <p className="text-center text-white/30 text-xs mt-4">
          Dúvidas? Entre em contato pelo suporte da Hotmart
        </p>
      </div>
    </div>
  )
}
