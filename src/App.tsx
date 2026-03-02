import React, { useState, useMemo, useEffect } from 'react';
import { Calculator, Route, Calendar, MapPin, Navigation, FileText, DollarSign, Save, History, Trash2, ArrowRight, Download, FileSpreadsheet, BarChart3, ChevronDown, Search, Sun, Moon, Monitor, Share2, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type RouteHistory = {
  id: string;
  date: string;
  routeName: string;
  observations: string;
  isSunday: boolean;
  km: number | '';
  addresses: number | '';
  baseRate: number;
  bonus: number;
  total: number;
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'calculator' | 'history'>('calculator');
  const [routeDate, setRouteDate] = useState(() => {
    const today = new Date();
    // Adjust for timezone offset to get local date string correctly
    const localDate = new Date(today.getTime() - (today.getTimezoneOffset() * 60000));
    return localDate.toISOString().split('T')[0];
  });
  const [routeName, setRouteName] = useState('');
  const [observations, setObservations] = useState('');
  const [isSunday, setIsSunday] = useState(() => new Date().getDay() === 0);
  const [km, setKm] = useState<number | ''>('');
  const [addresses, setAddresses] = useState<number | ''>('');
  const [history, setHistory] = useState<RouteHistory[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');

  useEffect(() => {
    const savedTheme = localStorage.getItem('kangu_theme') as 'light' | 'dark' | 'system' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
      
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        root.classList.remove('light', 'dark');
        root.classList.add(e.matches ? 'dark' : 'light');
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    localStorage.setItem('kangu_theme', newTheme);
  };

  const displayedHistory = useMemo(() => {
    if (!searchQuery.trim()) return history;
    const query = searchQuery.toLowerCase();
    return history.filter(item => 
      item.routeName.toLowerCase().includes(query) ||
      item.date.includes(query) ||
      (item.observations && item.observations.toLowerCase().includes(query))
    );
  }, [history, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  useEffect(() => {
    const savedHistory = localStorage.getItem('kangu_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }
  }, []);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setRouteDate(newDate);
    
    if (newDate) {
      // Parse the date string (YYYY-MM-DD) and create a local date object
      // We split and use components to avoid timezone shift issues
      const [year, month, day] = newDate.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day);
      setIsSunday(dateObj.getDay() === 0);
    }
  };

  const saveToHistory = () => {
    if (calculation.total === 0) return;

    const newEntry: RouteHistory = {
      id: Date.now().toString(),
      date: routeDate,
      routeName: routeName || 'Rota sem nome',
      observations,
      isSunday,
      km,
      addresses,
      baseRate: calculation.baseRate,
      bonus: calculation.bonus,
      total: calculation.total,
    };

    const updatedHistory = [newEntry, ...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setHistory(updatedHistory);
    localStorage.setItem('kangu_history', JSON.stringify(updatedHistory));

    // Clear form fields
    setRouteName('');
    setObservations('');
    setKm('');
    setAddresses('');
    
    const today = new Date();
    const localDate = new Date(today.getTime() - (today.getTimezoneOffset() * 60000));
    const todayStr = localDate.toISOString().split('T')[0];
    setRouteDate(todayStr);
    setIsSunday(today.getDay() === 0);
  };

  const loadFromHistory = (entry: RouteHistory) => {
    setRouteDate(entry.date);
    setRouteName(entry.routeName === 'Rota sem nome' ? '' : entry.routeName);
    setObservations(entry.observations);
    setIsSunday(entry.isSunday);
    setKm(entry.km);
    setAddresses(entry.addresses);
    
    setActiveTab('calculator');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteFromHistory = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este cálculo do histórico?')) {
      const updatedHistory = history.filter(item => item.id !== id);
      setHistory(updatedHistory);
      localStorage.setItem('kangu_history', JSON.stringify(updatedHistory));
    }
  };

  const clearAllHistory = () => {
    if (history.length === 0) return;
    
    if (window.confirm('⚠️ ATENÇÃO: Tem certeza que deseja apagar TODO o histórico de rotas? Esta ação não pode ser desfeita.')) {
      setHistory([]);
      localStorage.removeItem('kangu_history');
      setSearchQuery('');
    }
  };

  const shareRoute = async (item: RouteHistory) => {
    const formattedDate = new Date(item.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    const dayType = item.isSunday ? 'Domingo' : 'Segunda à Sábado';
    
    const text = `*Detalhes da Rota Kangu*\n\n` +
      `📍 *Rota:* ${item.routeName}\n` +
      `📅 *Data:* ${formattedDate}\n` +
      `🗓️ *Dia:* ${dayType}\n` +
      `🛣️ *KM Total:* ${item.km || 0} km\n` +
      `🏠 *Endereços:* ${item.addresses || 0}\n` +
      `💰 *Valor Base:* ${formatCurrency(item.baseRate)}\n` +
      `🎁 *Bônus:* ${formatCurrency(item.bonus)}\n` +
      `💵 *Total Bruto:* ${formatCurrency(item.total)}\n` +
      (item.observations ? `\n📝 *Observações:* ${item.observations}` : '');

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Rota Kangu - ${item.routeName}`,
          text: text,
        });
      } catch (error) {
        console.error('Error sharing route:', error);
      }
    } else {
      // Fallback to clipboard if Web Share API is not supported
      try {
        await navigator.clipboard.writeText(text);
        alert('Detalhes da rota copiados para a área de transferência!');
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        alert('Não foi possível copiar os detalhes da rota.');
      }
    }
  };

  const exportToCSV = () => {
    if (history.length === 0) return;

    const headers = ['Data', 'Rota', 'Dia', 'KM', 'Endereços', 'Valor Base', 'Bônus', 'Total Bruto', 'Observações'];
    const csvContent = [
      headers.join(','),
      ...history.map(item => [
        item.date,
        `"${item.routeName}"`,
        item.isSunday ? 'Domingo' : 'Seg-Sáb',
        item.km,
        item.addresses,
        item.baseRate.toFixed(2),
        item.bonus.toFixed(2),
        item.total.toFixed(2),
        `"${item.observations.replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `kangu_historico_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    if (history.length === 0) return;

    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Histórico de Rotas Kangu', 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 30);

    const tableData = history.map(item => [
      new Date(item.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
      item.routeName,
      item.isSunday ? 'Domingo' : 'Seg-Sáb',
      `${item.km || 0} km`,
      item.addresses || 0,
      formatCurrency(item.baseRate),
      formatCurrency(item.bonus),
      formatCurrency(item.total)
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['Data', 'Rota', 'Dia', 'KM', 'Endereços', 'Base', 'Bônus', 'Total']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [250, 204, 21], textColor: [0, 0, 0] }, // yellow-400
      styles: { fontSize: 9 },
    });

    doc.save(`kangu_historico_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportRouteToPDF = (item: RouteHistory) => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Detalhes da Rota Kangu', 14, 22);
    
    doc.setFontSize(12);
    const formattedDate = new Date(item.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    const dayType = item.isSunday ? 'Domingo' : 'Segunda à Sábado';
    
    doc.text(`Rota: ${item.routeName}`, 14, 40);
    doc.text(`Data: ${formattedDate}`, 14, 50);
    doc.text(`Dia: ${dayType}`, 14, 60);
    doc.text(`KM Total: ${item.km || 0} km`, 14, 70);
    doc.text(`Endereços: ${item.addresses || 0}`, 14, 80);
    
    doc.text(`Valor Base: ${formatCurrency(item.baseRate)}`, 14, 100);
    doc.text(`Bônus: ${formatCurrency(item.bonus)}`, 14, 110);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Bruto: ${formatCurrency(item.total)}`, 14, 130);
    
    if (item.observations) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Observações:', 14, 150);
      
      const splitObs = doc.splitTextToSize(item.observations, 180);
      doc.text(splitObs, 14, 160);
    }

    doc.save(`rota_${item.routeName.replace(/\s+/g, '_') || 'sem_nome'}_${item.date}.pdf`);
  };

  const generateReport = (period: 'weekly' | 'monthly') => {
    const now = new Date();
    const filteredHistory = history.filter(item => {
      const itemDate = new Date(item.date);
      if (period === 'weekly') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return itemDate >= oneWeekAgo && itemDate <= now;
      } else {
        return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
      }
    });

    const totalGanhos = filteredHistory.reduce((acc, item) => acc + item.total, 0);
    const totalKm = filteredHistory.reduce((acc, item) => acc + (Number(item.km) || 0), 0);
    const totalEnderecos = filteredHistory.reduce((acc, item) => acc + (Number(item.addresses) || 0), 0);
    const totalRotas = filteredHistory.length;

    alert(`Relatório ${period === 'weekly' ? 'Semanal (Últimos 7 dias)' : 'Mensal (Mês Atual)'}\n\n` +
          `Total de Rotas: ${totalRotas}\n` +
          `KM Total Rodado: ${totalKm} km\n` +
          `Endereços Visitados: ${totalEnderecos}\n` +
          `Ganhos Totais: ${formatCurrency(totalGanhos)}`);
  };

  const calculation = useMemo(() => {
    const numKm = Number(km);
    const numAddresses = Number(addresses);

    let baseRate = 0;
    if (km !== '') {
      if (numKm >= 0 && numKm <= 100) {
        baseRate = isSunday ? 315.27 : 262.73;
      } else if (numKm >= 101 && numKm <= 150) {
        baseRate = isSunday ? 361.12 : 300.94;
      } else if (numKm >= 151 && numKm <= 200) {
        baseRate = isSunday ? 411.95 : 343.29;
      } else if (numKm >= 201 && numKm <= 300) {
        baseRate = isSunday ? 457.67 : 381.39;
      } else if (numKm > 300) {
        baseRate = isSunday ? 508.62 : 423.85;
      }
    }

    let bonus = 0;
    if (addresses !== '' && numAddresses > 0) {
      if (numAddresses <= 60) {
        bonus = numAddresses * 0.37;
      } else if (numAddresses <= 90) {
        bonus = (60 * 0.37) + ((numAddresses - 60) * 2.00);
      } else {
        bonus = (60 * 0.37) + (30 * 2.00) + ((numAddresses - 90) * 1.04);
      }
    }

    return {
      baseRate,
      bonus,
      total: baseRate + bonus
    };
  }, [km, addresses, isSunday]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-8 px-4 sm:px-6 lg:px-8 font-sans transition-colors duration-200">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="relative text-center space-y-2">
          <div className="absolute right-0 top-0 flex items-center gap-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-1 shadow-sm">
            <button
              onClick={() => handleThemeChange('light')}
              className={`p-1.5 rounded-md transition-colors ${theme === 'light' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
              title="Tema Claro"
            >
              <Sun className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleThemeChange('system')}
              className={`p-1.5 rounded-md transition-colors ${theme === 'system' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
              title="Tema do Sistema"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleThemeChange('dark')}
              className={`p-1.5 rounded-md transition-colors ${theme === 'dark' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
              title="Tema Escuro"
            >
              <Moon className="w-4 h-4" />
            </button>
          </div>

          <div className="inline-flex items-center justify-center p-3 bg-yellow-400 rounded-2xl shadow-sm mb-2">
            <Calculator className="w-8 h-8 text-zinc-900" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Calculadora Kangu</h1>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium">Utilitário AM</p>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-xl">
          <button
            onClick={() => setActiveTab('calculator')}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'calculator'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50'
            }`}
          >
            Calculadora
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'history'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50'
            }`}
          >
            Histórico e Relatórios
          </button>
        </div>

        {activeTab === 'calculator' ? (
          /* Main Card */
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="p-6 sm:p-8 space-y-8">
              
              {/* Input Section */}
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Route className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                  Dados da Rota
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="routeDate" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Data da Rota</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Calendar className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
                      </div>
                      <input
                        type="date"
                        id="routeDate"
                        value={routeDate}
                        onChange={handleDateChange}
                        className="block w-full pl-10 pr-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 sm:text-sm transition-colors text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="routeName" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Nome da Rota</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Navigation className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
                      </div>
                      <input
                        type="text"
                        id="routeName"
                        value={routeName}
                        onChange={(e) => setRouteName(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 sm:text-sm transition-colors text-zinc-900 dark:text-zinc-100"
                        placeholder="Ex: Rota Sul 01"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="dayType" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Dia da Semana</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
                    </div>
                    <select
                      id="dayType"
                      value={isSunday ? 'sunday' : 'weekday'}
                      onChange={(e) => setIsSunday(e.target.value === 'sunday')}
                      className="block w-full pl-10 pr-10 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 sm:text-sm appearance-none transition-colors text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="weekday">Segunda à Sábado</option>
                      <option value="sunday">Domingo</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="km" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">KM Total Rodado</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Route className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
                    </div>
                    <input
                      type="number"
                      id="km"
                      min="0"
                      value={km}
                      onChange={(e) => setKm(e.target.value === '' ? '' : Number(e.target.value))}
                      className="block w-full pl-10 pr-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 sm:text-sm transition-colors text-zinc-900 dark:text-zinc-100"
                      placeholder="Ex: 120"
                    />
                  </div>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <label htmlFor="addresses" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Endereços Visitados</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPin className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
                    </div>
                    <input
                      type="number"
                      id="addresses"
                      min="0"
                      value={addresses}
                      onChange={(e) => setAddresses(e.target.value === '' ? '' : Number(e.target.value))}
                      className="block w-full pl-10 pr-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 sm:text-sm transition-colors text-zinc-900 dark:text-zinc-100"
                      placeholder="Ex: 65"
                    />
                  </div>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <label htmlFor="observations" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Observações</label>
                  <div className="relative">
                    <div className="absolute top-3 left-3 pointer-events-none">
                      <FileText className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
                    </div>
                    <textarea
                      id="observations"
                      rows={3}
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 sm:text-sm transition-colors resize-none text-zinc-900 dark:text-zinc-100"
                      placeholder="Anotações adicionais sobre a rota..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-zinc-200 dark:bg-zinc-800 w-full" />

            {/* Results Section */}
            <div className="p-6 sm:p-8 pt-6 sm:pt-6 space-y-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                Resumo de Ganhos
              </h2>

              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-6 space-y-4 border border-zinc-100 dark:border-zinc-800">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400 font-medium">Valor Base (KM)</span>
                  <span className="text-zinc-900 dark:text-zinc-100 font-semibold">{formatCurrency(calculation.baseRate)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400 font-medium">Bônus por Endereços</span>
                  <span className="text-zinc-900 dark:text-zinc-100 font-semibold">{formatCurrency(calculation.bonus)}</span>
                </div>
                
                <div className="h-px bg-zinc-200 dark:bg-zinc-700 w-full my-4" />
                
                <div className="flex justify-between items-center">
                  <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Valor Bruto Total</span>
                  <span className="text-2xl font-bold text-green-600 dark:text-green-500">{formatCurrency(calculation.total)}</span>
                </div>
                
                <button
                  onClick={saveToHistory}
                  disabled={calculation.total === 0}
                  className="w-full mt-6 flex items-center justify-center gap-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 py-3 px-4 rounded-xl font-medium hover:bg-zinc-800 dark:hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-5 h-5" />
                  Salvar Cálculo
                </button>
              </div>
            </div>

          </div>
        ) : (
          /* History Section */
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <button
                onClick={() => generateReport('weekly')}
                className="flex items-center justify-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 py-3 px-4 rounded-xl font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-sm"
              >
                <BarChart3 className="w-5 h-5 text-blue-500" />
                Resumo Semanal
              </button>
              <button
                onClick={() => generateReport('monthly')}
                className="flex items-center justify-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 py-3 px-4 rounded-xl font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-sm"
              >
                <BarChart3 className="w-5 h-5 text-purple-500" />
                Resumo Mensal
              </button>
              <button
                onClick={exportToCSV}
                disabled={history.length === 0}
                className="flex items-center justify-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 py-3 px-4 rounded-xl font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileSpreadsheet className="w-5 h-5 text-green-600" />
                Exportar CSV
              </button>
              <button
                onClick={exportToPDF}
                disabled={history.length === 0}
                className="flex items-center justify-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 py-3 px-4 rounded-xl font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileDown className="w-5 h-5 text-red-500" />
                Exportar PDF
              </button>
              <button
                onClick={clearAllHistory}
                disabled={history.length === 0}
                className="flex items-center justify-center gap-2 bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 py-3 px-4 rounded-xl font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:border-zinc-200 dark:disabled:border-zinc-800 disabled:text-zinc-400 dark:disabled:text-zinc-600 disabled:hover:bg-white dark:disabled:hover:bg-zinc-900"
              >
                <Trash2 className="w-5 h-5" />
                Limpar Tudo
              </button>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <div className="p-6 sm:p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <History className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                    Histórico de Cálculos
                  </h2>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">{history.length} rotas salvas</span>
                </div>
                
                {history.length > 0 && (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar por nome da rota, data ou observações..."
                      className="block w-full pl-10 pr-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 sm:text-sm transition-colors text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                )}
                
                {history.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
                    <History className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
                    <p>Nenhum cálculo salvo ainda.</p>
                  </div>
                ) : displayedHistory.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
                    <Search className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
                    <p>Nenhum resultado encontrado para "{searchQuery}".</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {displayedHistory.map((item) => {
                      const isExpanded = expandedItems.has(item.id);
                      return (
                        <div key={item.id} className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden transition-all hover:border-zinc-300 dark:hover:border-zinc-700">
                          {/* Header / Summary (Always visible) */}
                          <div 
                            className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center cursor-pointer"
                            onClick={() => toggleExpand(item.id)}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <div className={`p-2 rounded-lg transition-colors ${isExpanded ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300' : 'bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 shadow-sm border border-zinc-200 dark:border-zinc-700'}`}>
                                <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{item.routeName}</span>
                                  <span className="text-xs font-medium px-2 py-1 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-md">
                                    {new Date(item.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                  </span>
                                </div>
                                <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">
                                  {formatCurrency(item.total)}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-end w-full sm:w-auto gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => exportRouteToPDF(item)}
                                className="flex items-center gap-1.5 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl transition-colors text-sm font-medium"
                                title="Exportar PDF"
                              >
                                <FileDown className="w-4 h-4" />
                                <span className="hidden sm:inline">PDF</span>
                              </button>
                              <button
                                onClick={() => shareRoute(item)}
                                className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl transition-colors text-sm font-medium"
                                title="Compartilhar"
                              >
                                <Share2 className="w-4 h-4" />
                                <span className="hidden sm:inline">Compartilhar</span>
                              </button>
                              <button
                                onClick={() => loadFromHistory(item)}
                                className="flex items-center gap-1.5 px-3 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-500 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 rounded-xl transition-colors text-sm font-medium"
                                title="Carregar dados"
                              >
                                <ArrowRight className="w-4 h-4" />
                                <span className="hidden sm:inline">Carregar</span>
                              </button>
                              <button
                                onClick={() => deleteFromHistory(item.id)}
                                className="flex items-center gap-1.5 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors text-sm font-medium"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span className="hidden sm:inline">Excluir</span>
                              </button>
                            </div>
                          </div>

                          {/* Expanded Details */}
                          {isExpanded && (
                            <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-2 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 mt-4">
                                <div className="space-y-1">
                                  <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1"><Route className="w-3.5 h-3.5" /> KM Total</span>
                                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{item.km || 0} km</p>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Endereços</span>
                                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{item.addresses || 0}</p>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Dia</span>
                                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{item.isSunday ? 'Domingo' : 'Seg-Sáb'}</p>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" /> Valor Base</span>
                                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{formatCurrency(item.baseRate)}</p>
                                </div>
                              </div>
                              
                              {item.observations && (
                                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 mt-2">
                                  <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1 mb-1"><FileText className="w-3.5 h-3.5" /> Observações</span>
                                  <p className="text-sm text-zinc-700 dark:text-zinc-300">{item.observations}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer info */}
        <p className="text-center text-xs text-zinc-400">
          Valores baseados na Tabela Kangu - Utilitário AM
        </p>
      </div>
    </div>
  );
}
