'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { 
  Calculator, 
  RefreshCw, 
  History, 
  TrendingUp, 
  DollarSign, 
  Euro
} from 'lucide-react'
import { currencyService, type CurrencyRate, type HistoryRate, getEffectiveRate } from '@/services/currencyService'

const formatNumber = (val: string | number) => {
  if (val === '' || val === undefined || val === null) return ''
  const num = typeof val === 'number' ? val : parseFloat(val)
  if (isNaN(num)) return ''
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num)
}

const cleanNumberString = (val: string) => {
  let cleaned = val.replace(/,/g, '.')
  const parts = cleaned.split('.')
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('')
  }
  return cleaned.replace(/[^0-9.]/g, '')
}

export function CurrencyCalculator() {
  const [isOpen, setIsOpen] = useState(false)
  const [usdRate, setUsdRate] = useState<CurrencyRate | null>(null)
  const [eurRate, setEurRate] = useState<CurrencyRate | null>(null)
  const [usdHistory, setUsdHistory] = useState<HistoryRate[]>([])
  const [eurHistory, setEurHistory] = useState<HistoryRate[]>([])
  
  const [isLoading, setIsLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [activeCurrency, setActiveCurrency] = useState<'USD' | 'EUR'>('USD')
  const [focusedInput, setFocusedInput] = useState<'ves' | 'usd' | 'eur' | null>(null)
  
  // Values for calculation
  const [vesValue, setVesValue] = useState<string>('')
  const [usdValue, setUsdValue] = useState<string>('')
  const [eurValue, setEurValue] = useState<string>('')
  
  // Custom/Selected rates
  const [selectedUsdRate, setSelectedUsdRate] = useState<number | null>(null)
  const [selectedEurRate, setSelectedEurRate] = useState<number | null>(null)

  const popoverRef = useRef<HTMLDivElement>(null)

  const effectiveUsdRate = getEffectiveRate(usdRate, usdHistory)
  const effectiveEurRate = getEffectiveRate(eurRate, eurHistory)

  const getNextDayWarningDate = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const activeRate = activeCurrency === 'USD' ? effectiveUsdRate : activeCurrency === 'EUR' ? effectiveEurRate : null
    if (!activeRate) return null

    // Extract date from fechaActualizacion (YYYY-MM-DD)
    const cleanStr = activeRate.fechaActualizacion.substring(0, 10)
    const [year, month, day] = cleanStr.split('-').map(Number)
    const rateDate = new Date(year, month - 1, day)

    if (rateDate.getTime() > today.getTime()) {
      return rateDate.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' })
    }
    return null
  }

  const nextDayDateStr = getNextDayWarningDate()

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [usd, eur, usdHist, eurHist] = await Promise.all([
        currencyService.getUsdRate(),
        currencyService.getEurRate(),
        currencyService.getUsdHistory(),
        currencyService.getEurHistory()
      ])
      
      setUsdRate(usd)
      setEurRate(eur)
      setUsdHistory(usdHist)
      setEurHistory(eurHist)
      
      const effUsd = getEffectiveRate(usd, usdHist)
      const effEur = getEffectiveRate(eur, eurHist)

      if (!selectedUsdRate) setSelectedUsdRate(effUsd ? (effUsd.promedio || effUsd.valor) : (usd.promedio || usd.valor))
      if (!selectedEurRate) setSelectedEurRate(effEur ? (effEur.promedio || effEur.valor) : (eur.promedio || eur.valor))
    } catch (error) {
      console.error('Error fetching currency data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedUsdRate, selectedEurRate])

  useEffect(() => {
    fetchData()
  }, [])

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const calculateFromVes = (val: string) => {
    setVesValue(val)
    const num = parseFloat(val)
    if (isNaN(num)) {
      setUsdValue('')
      setEurValue('')
      return
    }
    
    if (selectedUsdRate) setUsdValue((num / selectedUsdRate).toFixed(2))
    if (selectedEurRate) setEurValue((num / selectedEurRate).toFixed(2))
  }

  const calculateFromUsd = (val: string) => {
    setUsdValue(val)
    const num = parseFloat(val)
    if (isNaN(num)) {
      setVesValue('')
      setEurValue('')
      return
    }
    
    if (selectedUsdRate) {
      const ves = num * selectedUsdRate
      setVesValue(ves.toFixed(2))
      if (selectedEurRate) setEurValue((ves / selectedEurRate).toFixed(2))
    }
  }

  const calculateFromEur = (val: string) => {
    setEurValue(val)
    const num = parseFloat(val)
    if (isNaN(num)) {
      setVesValue('')
      setUsdValue('')
      return
    }
    
    if (selectedEurRate) {
      const ves = num * selectedEurRate
      setVesValue(ves.toFixed(2))
      if (selectedUsdRate) setUsdValue((ves / selectedUsdRate).toFixed(2))
    }
  }

  const handleSelectHistoryRate = (rate: number) => {
    if (activeCurrency === 'USD') {
      setSelectedUsdRate(rate)
      if (vesValue) calculateFromVes(vesValue)
    } else {
      setSelectedEurRate(rate)
      if (vesValue) calculateFromVes(vesValue)
    }
    setShowHistory(false)
  }

  const resetRates = () => {
    const targetUsd = effectiveUsdRate ? (effectiveUsdRate.promedio || effectiveUsdRate.valor) : null
    const targetEur = effectiveEurRate ? (effectiveEurRate.promedio || effectiveEurRate.valor) : null

    if (targetUsd) setSelectedUsdRate(targetUsd)
    if (targetEur) setSelectedEurRate(targetEur)
    
    const num = parseFloat(vesValue)
    if (!isNaN(num)) {
      if (targetUsd) setUsdValue((num / targetUsd).toFixed(2))
      if (targetEur) setEurValue((num / targetEur).toFixed(2))
    }
  }

  return (
    <div className="relative" ref={popoverRef}>
      {/* Trigger Button */}
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative h-10 w-10 rounded-xl bg-slate-100 hover:bg-blue-50 text-blue-600 transition-all border border-slate-200 flex items-center justify-center cursor-pointer group"
        title="Calculadora de Divisas"
      >
        <Calculator className="h-5 w-5 group-hover:scale-105 transition-transform" />
        {isLoading && (
          <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
          </span>
        )}
      </button>

      {/* Popover Content */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden text-left font-sans">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 text-white">
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-bold text-sm flex items-center gap-2 m-0">
                <Calculator className="h-4.5 w-4.5 text-blue-400" />
                Calculadora de Divisas
              </h3>
              <button 
                type="button"
                className="h-7 w-7 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                onClick={fetchData}
                disabled={isLoading}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 m-0 font-medium">
              Tasa BCV Oficial - {new Date().toLocaleDateString('es-VE', { day: 'numeric', month: 'long' })}
            </p>
          </div>

          <div className="p-4 space-y-4">
            {!showHistory ? (
              <div className="space-y-4">
                {/* Warning Banner for Next Day Rate */}
                {nextDayDateStr && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-2.5">
                    <span className="text-amber-500 shrink-0 mt-0.5 animate-pulse">⚠️</span>
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-amber-700 uppercase tracking-wider m-0">Tasa del Día Siguiente</p>
                      <p className="text-[10px] text-amber-950 font-medium mt-0.5 leading-relaxed m-0">
                        Por feriado o fin de semana, se utiliza la tasa oficial del próximo día hábil ({nextDayDateStr}).
                      </p>
                    </div>
                  </div>
                )}

                {/* Inputs */}
                <div className="space-y-3">
                  <div className="relative">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Bolívares (VES)</label>
                    <div className="relative">
                      <input 
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={focusedInput === 'ves' ? vesValue : formatNumber(vesValue)}
                        onChange={(e) => calculateFromVes(cleanNumberString(e.target.value))}
                        onFocus={() => setFocusedInput('ves')}
                        onBlur={() => setFocusedInput(null)}
                        className="w-full pl-9 pr-3 h-10 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none text-slate-900 font-mono font-bold text-sm bg-slate-50 focus:bg-white transition-all"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">Bs</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Dólares (USD)</label>
                      <div className="relative">
                        <input 
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={focusedInput === 'usd' ? usdValue : formatNumber(usdValue)}
                          onChange={(e) => calculateFromUsd(cleanNumberString(e.target.value))}
                          onFocus={() => setFocusedInput('usd')}
                          onBlur={() => setFocusedInput(null)}
                          className="w-full pl-7 pr-3 h-10 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none text-slate-900 font-mono font-bold text-sm bg-slate-50 focus:bg-white transition-all"
                        />
                        <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      </div>
                    </div>
                    <div className="flex-1 relative">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Euros (EUR)</label>
                      <div className="relative">
                        <input 
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={focusedInput === 'eur' ? eurValue : formatNumber(eurValue)}
                          onChange={(e) => calculateFromEur(cleanNumberString(e.target.value))}
                          onFocus={() => setFocusedInput('eur')}
                          onBlur={() => setFocusedInput(null)}
                          className="w-full pl-7 pr-3 h-10 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none text-slate-900 font-mono font-bold text-sm bg-slate-50 focus:bg-white transition-all"
                        />
                        <Euro className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Currency Toggle Buttons */}
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button 
                    type="button"
                    onClick={() => { setActiveCurrency('USD'); setShowHistory(false); }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      activeCurrency === 'USD' ? "bg-white text-blue-600 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <DollarSign className="h-3 w-3" /> USD
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setActiveCurrency('EUR'); setShowHistory(false); }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      activeCurrency === 'EUR' ? "bg-white text-blue-600 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Euro className="h-3 w-3" /> EUR
                  </button>
                </div>

                {/* Selected Rate Info Card */}
                <div className="bg-blue-50/40 p-3 rounded-xl border border-blue-100 flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Tasa en uso ({activeCurrency})</span>
                    <button 
                      type="button"
                      className="px-2 py-1 hover:bg-blue-50 rounded-md text-[10px] font-extrabold text-blue-600 cursor-pointer flex items-center gap-1"
                      onClick={() => setShowHistory(true)}
                    >
                      <History className="h-3 w-3" /> Historial
                    </button>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-lg font-black text-slate-900 tracking-tight font-mono">
                      {activeCurrency === 'USD' ? formatNumber(selectedUsdRate || 0) : formatNumber(selectedEurRate || 0)}
                      <span className="text-[10px] text-slate-400 font-bold ml-1 font-sans">VES / {activeCurrency}</span>
                    </span>
                    {((activeCurrency === 'USD' 
                      ? selectedUsdRate !== (effectiveUsdRate?.promedio || effectiveUsdRate?.valor) 
                      : selectedEurRate !== (effectiveEurRate?.promedio || effectiveEurRate?.valor)) && (
                      <button 
                        type="button"
                        className="text-[10px] text-amber-600 hover:text-amber-700 font-bold hover:underline cursor-pointer border-none bg-none p-0"
                        onClick={resetRates}
                      >
                        Resetear a hoy
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between shrink-0 mb-1">
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1 m-0">
                    <History className="h-3.5 w-3.5" />
                    Historial {activeCurrency}
                  </h4>
                  <button 
                    type="button"
                    className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-600 cursor-pointer"
                    onClick={() => setShowHistory(false)}
                  >
                    Volver
                  </button>
                </div>
                
                <div className="max-h-[180px] overflow-y-auto rounded-xl border border-slate-200 pr-1 divide-y divide-slate-100">
                  {(activeCurrency === 'USD' ? usdHistory : eurHistory).map((item, idx) => (
                    <button 
                      key={idx}
                      type="button"
                      className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors group cursor-pointer border-none text-left"
                      onClick={() => handleSelectHistoryRate(item.promedio || item.valor)}
                    >
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold m-0">
                          {(() => {
                            const dateStr = item.fecha.split('T')[0]
                            const [year, month, day] = dateStr.split('-')
                            const localDate = new Date(Number(year), Number(month) - 1, Number(day))
                            return localDate.toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric', month: 'short' })
                          })()}
                        </p>
                        <p className="text-sm font-extrabold font-mono text-slate-900 m-0 mt-0.5">
                          {formatNumber(item.promedio || item.valor)}
                        </p>
                      </div>
                      <TrendingUp className="h-3.5 w-3.5 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
