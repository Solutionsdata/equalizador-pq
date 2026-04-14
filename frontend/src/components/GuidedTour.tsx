import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X, ArrowRight, ArrowLeft, FolderOpen, Table2,
  Building2, LineChart, CheckCircle,
} from 'lucide-react'

const TOUR_KEY = 'tour_completed_v1'

interface Step {
  title: string
  description: string
  icon: React.ElementType
  action?: string
  actionRoute?: string
}

const STEPS: Step[] = [
  {
    title: 'Bem-vindo ao Software de Equalização',
    description:
      'Este tour rápido mostra como usar a ferramenta para equalizar propostas comerciais e tomar decisões de compras com segurança e velocidade.',
    icon: CheckCircle,
  },
  {
    title: '1. Crie um Projeto',
    description:
      'Cada processo licitatório é um Projeto. Nele você define o nome, tipo de obra, número da licitação e acompanha o status. Comece criando seu primeiro projeto.',
    icon: FolderOpen,
    action: 'Ir para Projetos',
    actionRoute: '/projetos',
  },
  {
    title: '2. Monte a Planilha PQ',
    description:
      'A Planilha de Quantitativos define todos os itens do escopo: código, descrição, unidade, quantidade e preço de referência. Você pode importar via Excel com um clique.',
    icon: Table2,
  },
  {
    title: '3. Adicione as Propostas',
    description:
      'Na aba Equalização, cadastre cada fornecedor e envie o modelo Excel para preenchimento de preços. Ao receber de volta, importe e os preços são carregados automaticamente.',
    icon: Building2,
  },
  {
    title: '4. Analise e Decida',
    description:
      'As Análises comparam todas as propostas lado a lado, identificam o cherry picking (melhor preço por item), desvios por fornecedor e a Curva ABC de valor. Exporte tudo para Excel.',
    icon: LineChart,
    action: 'Explorar Análises',
    actionRoute: '/projetos',
  },
]

export default function GuidedTour() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const done = localStorage.getItem(TOUR_KEY)
    if (!done) {
      // small delay so page renders first
      const t = setTimeout(() => setVisible(true), 800)
      return () => clearTimeout(t)
    }
  }, [])

  function finish() {
    localStorage.setItem(TOUR_KEY, '1')
    setVisible(false)
  }

  function next() {
    if (step < STEPS.length - 1) setStep((s) => s + 1)
    else finish()
  }

  function prev() {
    if (step > 0) setStep((s) => s - 1)
  }

  function handleAction(route?: string) {
    finish()
    if (route) navigate(route)
  }

  if (!visible) return null

  const current = STEPS[step]
  const Icon = current.icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
        onClick={finish}
      />

      {/* Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="p-6">
          {/* Close */}
          <button
            onClick={finish}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={16} />
          </button>

          {/* Step indicator */}
          <p className="text-xs text-gray-400 font-medium mb-4">
            Passo {step + 1} de {STEPS.length}
          </p>

          {/* Icon */}
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
            <Icon size={22} className="text-blue-600" />
          </div>

          {/* Content */}
          <h2 className="text-lg font-bold text-gray-900 mb-2">{current.title}</h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-6">{current.description}</p>

          {/* Dot indicators */}
          <div className="flex items-center gap-1.5 mb-6">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all ${
                  i === step ? 'w-4 h-1.5 bg-blue-600' : 'w-1.5 h-1.5 bg-gray-200'
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={prev}
              disabled={step === 0}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 disabled:opacity-0 transition-colors"
            >
              <ArrowLeft size={14} /> Anterior
            </button>

            <div className="flex items-center gap-2">
              {current.action && (
                <button
                  onClick={() => handleAction(current.actionRoute)}
                  className="text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  {current.action}
                </button>
              )}
              <button
                onClick={next}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
              >
                {step === STEPS.length - 1 ? 'Concluir' : 'Próximo'}
                {step < STEPS.length - 1 && <ArrowRight size={14} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Botão para rever o tour (ex: no Dashboard) */
export function RestartTourButton() {
  function restart() {
    localStorage.removeItem(TOUR_KEY)
    window.location.reload()
  }
  return (
    <button
      onClick={restart}
      className="text-xs text-gray-400 hover:text-blue-600 hover:underline transition-colors"
    >
      Ver tour novamente
    </button>
  )
}
