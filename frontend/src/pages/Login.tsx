import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { BarChart3, Eye, EyeOff, Clock } from 'lucide-react'

export default function Login() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [registered, setRegistered] = useState(false)

  const [form, setForm] = useState({
    nome: '', email: '', cargo: '', password: '',
  })

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(form.email, form.password)
        toast.success('Bem-vindo!')
      } else {
        await register({
          nome: form.nome,
          email: form.email,
          cargo: form.cargo || undefined,
          password: form.password,
        })
        setRegistered(true)
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      const status = err?.response?.status
      if (status === 401) {
        toast.error('E-mail ou senha inválidos. Verifique e tente novamente.')
      } else if (status === 402) {
        toast.error('Assinatura vencida. Contate o administrador para renovar o acesso.')
      } else if (status === 403) {
        toast.error('Conta aguardando aprovação ou desativada. Contate o administrador.')
      } else if (err?.isServerStarting || !err?.response) {
        toast.error('Servidor inicializando… aguarde 30 segundos e tente novamente.')
      } else {
        toast.error(detail ?? 'Erro ao processar solicitação.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 mb-4">
            <BarChart3 size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Software Sourcing</h1>
        </div>

        {/* Tela pós-registro (aguardando aprovação) */}
        {registered ? (
          <div className="bg-white rounded-2xl p-8 shadow-2xl text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 mb-4">
              <Clock size={28} className="text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Cadastro enviado!</h2>
            <p className="text-gray-500 text-sm mb-6">
              Sua conta foi criada e está <strong>aguardando aprovação</strong> do administrador.
              Você receberá acesso assim que for aprovado.
            </p>
            <button
              onClick={() => { setRegistered(false); setMode('login') }}
              className="btn-primary w-full justify-center py-3"
            >
              Voltar para o login
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 shadow-2xl">
            {/* Tabs */}
            <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
              {(['login', 'register'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                    mode === m ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {m === 'login' ? 'Entrar' : 'Criar conta'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo *</label>
                    <input
                      className="input"
                      placeholder="Seu nome"
                      value={form.nome}
                      onChange={(e) => set('nome', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
                    <input className="input" placeholder="Ex: Analista, Engenheiro..." value={form.cargo} onChange={(e) => set('cargo', e.target.value)} />
                  </div>
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Após o cadastro, sua conta precisará ser aprovada pelo administrador antes do primeiro acesso.
                  </p>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail *</label>
                <input
                  className="input"
                  type="email"
                  placeholder="email@empresa.com"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha *</label>
                <div className="relative">
                  <input
                    className="input pr-10"
                    type={showPwd ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
                {loading ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Solicitar cadastro'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
