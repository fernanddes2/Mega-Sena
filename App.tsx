import React, { useState, useMemo, useCallback } from 'react';
import { Probabilities, SimulationResult, ResultTab, MegaSenaContest } from './types';
import { MEGASENA_HISTORY } from './megasena-history';

// --- CONSTANTS AND HELPERS (Defined outside component for performance) ---

const PROBABILIDADES_OFICIAIS: { [key: number]: Probabilities } = {
    6: { sena: 50063860, quina: 154518, quadra: 2332 },
    7: { sena: 7151980, quina: 44981, quadra: 1038 },
    8: { sena: 1787995, quina: 17192, quadra: 539 },
    9: { sena: 595998, quina: 7791, quadra: 312 },
    10: { sena: 238399, quina: 3973, quadra: 195 },
    11: { sena: 108363, quina: 2211, quadra: 129 },
    12: { sena: 54182, quina: 1317, quadra: 90 },
    13: { sena: 29175, quina: 828, quadra: 65 },
    14: { sena: 16671, quina: 544, quadra: 48 },
    15: { sena: 10003, quina: 370, quadra: 37 },
    16: { sena: 6252, quina: 260, quadra: 29 },
    17: { sena: 4045, quina: 188, quadra: 23 },
    18: { sena: 2697, quina: 139, quadra: 19 },
    19: { sena: 1845, quina: 105, quadra: 16 },
    20: { sena: 1292, quina: 81, quadra: 13 },
};

function combinations(n: number, k: number): number {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;
    if (k > n / 2) k = n - k;
    let res = 1;
    for (let i = 1; i <= k; i++) {
        res = (res * (n - i + 1)) / i;
    }
    return Math.round(res);
}

const formatInteger = (num: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(num);
const formatCurrency = (num: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);

const downloadCSV = (data: number[][], filename: string) => {
    if (data.length === 0) return;
    const header = data[0].map((_, i) => `Dezena_${i + 1}`).join(',');
    const csvContent = [header, ...data.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};


// --- UI HELPER COMPONENTS (Stateless) ---

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-lg p-6 ${className}`}>
        {children}
    </div>
);

const Stat: React.FC<{ label: string; value: string; icon: React.ReactNode }> = ({ label, value, icon }) => (
    <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 text-cyan-400">{icon}</div>
        <div>
            <p className="text-sm font-medium text-slate-400">{label}</p>
            <p className="text-lg font-bold text-white">{value}</p>
        </div>
    </div>
);

const GameBall: React.FC<{ number: number }> = ({ number }) => (
    <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-slate-700 rounded-full text-white font-bold text-sm sm:text-base shadow-inner">
        {String(number).padStart(2, '0')}
    </div>
);

// --- MAIN APP COMPONENT ---

export default function App() {
    // --- STATE MANAGEMENT ---
    const [dozensToBet, setDozensToBet] = useState(8);
    const [gamesToGenerate, setGamesToGenerate] = useState(10);
    const [generatedGames, setGeneratedGames] = useState<number[][]>([]);
    
    const [simulationsToRun, setSimulationsToRun] = useState(200000);
    const [isSimulating, setIsSimulating] = useState(false);
    const [simulationProgress, setSimulationProgress] = useState(0);
    const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
    const [activeTab, setActiveTab] = useState<ResultTab>('sena');
    
    const [megaSenaHistory, setMegaSenaHistory] = useState<MegaSenaContest[]>(MEGASENA_HISTORY);
    const [historySearchTerm, setHistorySearchTerm] = useState('');

    // --- DERIVED DATA & MEMOIZED CALCULATIONS ---
    const betDetails = useMemo(() => {
        const PRECO_APOSTA_SIMPLES = 6.00;
        const TOTAL_COMBINACOES_SENA = combinations(60, 6);
        const numeroDeApostas = combinations(dozensToBet, 6);
        const custoTotal = numeroDeApostas * PRECO_APOSTA_SIMPLES;
        const probabilidadeSena = TOTAL_COMBINACOES_SENA / numeroDeApostas;
        return { numeroDeApostas, custoTotal, probabilidadeSena };
    }, [dozensToBet]);
    
    const filteredHistory = useMemo(() => {
        if (!historySearchTerm.trim()) {
            return megaSenaHistory;
        }
        return megaSenaHistory.filter(contest =>
            String(contest.concurso).includes(historySearchTerm)
        );
    }, [historySearchTerm, megaSenaHistory]);

    // --- EVENT HANDLERS & LOGIC ---
    const handleGenerateGames = useCallback(() => {
        const allNumbers = Array.from({ length: 60 }, (_, i) => i + 1);
        const newGames: number[][] = [];
        for (let i = 0; i < gamesToGenerate; i++) {
            const shuffled = [...allNumbers].sort(() => 0.5 - Math.random());
            const game = shuffled.slice(0, dozensToBet).sort((a, b) => a - b);
            newGames.push(game);
        }
        setGeneratedGames(newGames);
    }, [gamesToGenerate, dozensToBet]);

    const handleRunSimulation = useCallback(async () => {
        setIsSimulating(true);
        setSimulationProgress(0);
        setSimulationResult(null);

        const sorteioGabarito = new Set<number>();
        while(sorteioGabarito.size < 6) {
            sorteioGabarito.add(Math.floor(Math.random() * 60) + 1);
        }
        const sorteioArray = Array.from(sorteioGabarito).sort((a,b) => a - b);

        const senaJogos: number[][] = [];
        const quinaJogos: number[][] = [];
        const quadraJogos: number[][] = [];

        const CHUNK_SIZE = 10000;
        for (let i = 0; i < simulationsToRun; i += CHUNK_SIZE) {
            const chunkEnd = Math.min(i + CHUNK_SIZE, simulationsToRun);
            for (let j = i; j < chunkEnd; j++) {
                const jogoSimulado = new Set<number>();
                 while(jogoSimulado.size < dozensToBet) {
                    jogoSimulado.add(Math.floor(Math.random() * 60) + 1);
                }
                
                let acertos = 0;
                sorteioGabarito.forEach(num => {
                    if (jogoSimulado.has(num)) {
                        acertos++;
                    }
                });
                
                const jogoSimuladoArray = Array.from(jogoSimulado).sort((a,b) => a - b);
                if (acertos === 6) senaJogos.push(jogoSimuladoArray);
                else if (acertos === 5) quinaJogos.push(jogoSimuladoArray);
                else if (acertos === 4) quadraJogos.push(jogoSimuladoArray);
            }
            
            setSimulationProgress(Math.round((chunkEnd / simulationsToRun) * 100));
            await new Promise(resolve => setTimeout(resolve, 0)); // Yield to main thread
        }

        setSimulationResult({
            senas: senaJogos.length,
            quinas: quinaJogos.length,
            quadras: quadraJogos.length,
            senaJogos,
            quinaJogos,
            quadraJogos,
            sorteioUsado: sorteioArray,
        });
        setIsSimulating(false);
    }, [simulationsToRun, dozensToBet]);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (!text) {
                alert("Erro ao ler o arquivo.");
                return;
            }

            try {
                const rows = text.split(/[\r\n]+/).filter(row => row.trim() !== '');
                if (rows.length < 2) throw new Error("Arquivo CSV inválido ou vazio. Deve conter cabeçalho e pelo menos uma linha de dados.");

                const header = rows[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
                const contestIndex = header.indexOf('concurso');
                const dateIndex = header.indexOf('data');
                const dozensIndex = header.indexOf('dezenas');

                if (contestIndex === -1 || dateIndex === -1 || dozensIndex === -1) {
                    throw new Error("Cabeçalho do CSV inválido. As colunas 'concurso', 'data' e 'dezenas' são obrigatórias.");
                }

                const newHistory: MegaSenaContest[] = [];
                for (let i = 1; i < rows.length; i++) {
                    const columns = rows[i].split(',');
                     if (columns.length < header.length) {
                        console.warn(`Pulando linha ${i + 1} por número incorreto de colunas.`);
                        continue;
                    }
                    
                    const dezenas = columns[dozensIndex]
                        .trim()
                        .replace(/"/g, '')
                        .split('-') 
                        .map(Number);
                    
                    if (dezenas.some(isNaN) || dezenas.length === 0) {
                        console.warn(`Pulando linha ${i + 1} por dezenas inválidas: ${columns[dozensIndex]}`);
                        continue;
                    }

                     const concurso = parseInt(columns[contestIndex], 10);
                    if (isNaN(concurso)) {
                        console.warn(`Pulando linha ${i + 1} por concurso inválido: ${columns[contestIndex]}`);
                        continue;
                    }

                    newHistory.push({
                        concurso: concurso,
                        data: columns[dateIndex].trim().replace(/"/g, ''),
                        dezenas: dezenas.sort((a,b) => a-b),
                    });
                }
                
                if (newHistory.length === 0) {
                     throw new Error("Nenhum concurso válido encontrado no arquivo.");
                }

                newHistory.sort((a, b) => b.concurso - a.concurso);
                setMegaSenaHistory(newHistory);
                alert(`Histórico importado com sucesso! ${newHistory.length} concursos carregados.`);

            } catch (error) {
                if (error instanceof Error) {
                    alert(`Erro ao processar o arquivo: ${error.message}`);
                } else {
                    alert('Ocorreu um erro desconhecido ao processar o arquivo.');
                }
            } finally {
                 if (event.target) {
                    event.target.value = '';
                }
            }
        };
        reader.onerror = () => {
             alert('Erro ao ler o arquivo.');
             if (event.target) {
                event.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    const handleRestoreDefaultHistory = useCallback(() => {
        setMegaSenaHistory(MEGASENA_HISTORY);
        alert('Histórico padrão restaurado.');
    }, []);

    // --- RENDER ---
    return (
        <div className="bg-slate-900 text-slate-200 min-h-screen p-4 sm:p-8 font-sans">
            <div className="max-w-7xl mx-auto">
                <header className="text-center mb-10">
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-500">
                        Garimpo Mega-Sena
                    </h1>
                    <p className="text-slate-400 mt-2">Simulador de Apostas e Análise de Probabilidades</p>
                </header>

                <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column: Controls & Game Generation */}
                    <div className="flex flex-col gap-8">
                        <Card>
                            <h2 className="text-2xl font-bold mb-4 text-emerald-400">1. Painel de Controle</h2>
                            <div className="space-y-4">
                                <label htmlFor="dozens-slider" className="block text-sm font-medium text-slate-300">
                                    Dezenas para Apostar: <span className="font-bold text-white text-lg">{dozensToBet}</span>
                                </label>
                                <input
                                    id="dozens-slider"
                                    type="range"
                                    min="6"
                                    max="20"
                                    value={dozensToBet}
                                    onChange={(e) => setDozensToBet(Number(e.target.value))}
                                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                />
                            </div>
                            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Stat label="Custo Total" value={formatCurrency(betDetails.custoTotal)} icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>} />
                                <Stat label="Equivale a Jogos" value={`${formatInteger(betDetails.numeroDeApostas)}`} icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>} />
                                <Stat label="Chance de Sena" value={`1 em ${formatInteger(betDetails.probabilidadeSena)}`} icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m10.4 12.6 2.8 2.8-2.8 2.8"></path></svg>} />
                            </div>
                        </Card>
                        <Card>
                             <h2 className="text-2xl font-bold mb-4 text-emerald-400">2. Gerador de Jogos</h2>
                             <div className="flex flex-col sm:flex-row gap-4 items-center mb-4">
                                 <input
                                     type="number"
                                     min="1"
                                     max="100"
                                     value={gamesToGenerate}
                                     onChange={(e) => setGamesToGenerate(Math.max(1, Math.min(100, Number(e.target.value))))}
                                     className="w-full sm:w-auto flex-grow bg-slate-700 text-white border border-slate-600 rounded-md px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                 />
                                 <button onClick={handleGenerateGames} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-md transition-colors duration-200">
                                     Gerar
                                 </button>
                             </div>
                             {generatedGames.length > 0 && (
                                <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                                     {generatedGames.map((game, index) => (
                                         <div key={index} className="flex items-center gap-2 bg-slate-700/50 p-2 rounded-lg">
                                             <span className="font-mono text-sm text-slate-400 w-12 text-center">#{index + 1}</span>
                                             <div className="flex flex-wrap gap-1">
                                                {game.map(num => <GameBall key={num} number={num} />)}
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                             )}
                             {generatedGames.length > 0 && (
                                 <button onClick={() => downloadCSV(generatedGames, 'Meus_Jogos.csv')} className="mt-4 w-full bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200">
                                     Download CSV
                                 </button>
                             )}
                        </Card>
                        <Card>
                            <h2 className="text-2xl font-bold mb-4 text-emerald-400">3. Histórico de Resultados</h2>
                            <div className="bg-slate-700/50 p-3 rounded-lg mb-4 border border-slate-600">
                                <p className="text-slate-300 text-sm mb-2 font-semibold">
                                    Importar histórico customizado
                                </p>
                                <p className="text-slate-400 text-xs mb-3">
                                    Colunas CSV: <code className="bg-slate-600 px-1 rounded text-white">concurso</code>, <code className="bg-slate-600 px-1 rounded text-white">data</code>, <code className="bg-slate-600 px-1 rounded text-white">dezenas</code> (ex: "04-08-15-16-23-42").
                                </p>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <label htmlFor="csv-upload" className="w-full text-center flex-grow cursor-pointer bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 text-sm">
                                        Carregar CSV
                                    </label>
                                    <input
                                        type="file"
                                        id="csv-upload"
                                        accept=".csv,text/csv"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    />
                                    <button onClick={handleRestoreDefaultHistory} title="Restaurar histórico original" className="w-full sm:w-auto bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-2 rounded-md transition-colors duration-200">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mx-auto"><path d="M3 2v6h6"></path><path d="M21 12A9 9 0 0 0 6 5.3L3 8"></path><path d="M21 22v-6h-6"></path><path d="M3 12a9 9 0 0 0 15 6.7l3-2.7"></path></svg>
                                    </button>
                                </div>
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar por concurso..."
                                value={historySearchTerm}
                                onChange={(e) => setHistorySearchTerm(e.target.value)}
                                className="w-full bg-slate-700 text-white border border-slate-600 rounded-md px-3 py-2 mb-4 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                                {filteredHistory.length > 0 ? (
                                    filteredHistory.map((contest) => (
                                        <div key={contest.concurso} className="bg-slate-700/50 p-3 rounded-lg">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-bold text-white">Concurso {contest.concurso}</span>
                                                <span className="text-sm text-slate-400">{new Date(contest.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1 justify-center">
                                                {contest.dezenas.map(num => <GameBall key={num} number={num} />)}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-slate-500 text-center py-4">Nenhum resultado encontrado.</p>
                                )}
                            </div>
                        </Card>
                    </div>

                    {/* Right Column: Simulation */}
                    <div className="flex flex-col gap-8">
                         <Card>
                            <h2 className="text-2xl font-bold mb-4 text-cyan-400">4. Simulação Monte Carlo</h2>
                             <div className="flex flex-col sm:flex-row gap-4 items-center mb-4">
                                 <input
                                     type="number"
                                     step="10000"
                                     min="1000"
                                     max="5000000"
                                     value={simulationsToRun}
                                     onChange={(e) => setSimulationsToRun(Number(e.target.value))}
                                     className="w-full sm:w-auto flex-grow bg-slate-700 text-white border border-slate-600 rounded-md px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                                     disabled={isSimulating}
                                 />
                                 <button onClick={handleRunSimulation} disabled={isSimulating} className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-md transition-colors duration-200">
                                     {isSimulating ? `Simulando...` : 'Iniciar Simulação'}
                                 </button>
                             </div>

                             {isSimulating && (
                                 <div>
                                     <div className="w-full bg-slate-700 rounded-full h-2.5">
                                         <div className="bg-cyan-500 h-2.5 rounded-full" style={{ width: `${simulationProgress}%` }}></div>
                                     </div>
                                     <p className="text-center text-sm mt-2 text-slate-400">{simulationProgress}%</p>
                                 </div>
                             )}

                             {simulationResult && (
                                 <div className="mt-6 animate-fade-in">
                                    <h3 className="text-lg font-bold text-slate-300">Resultado da Simulação</h3>
                                    <p className="text-sm text-slate-400 mb-2">Sorteio de referência:</p>
                                    <div className="flex gap-2 justify-center mb-4">{simulationResult.sorteioUsado.map(n => <GameBall key={n} number={n}/>)}</div>
                                    
                                    <div className="space-y-2 text-sm">
                                      <p>Jogos simulados: <span className="font-bold text-white">{formatInteger(simulationsToRun)}</span></p>
                                      <p>Quadras (4 acertos): <span className="font-bold text-white">{formatInteger(simulationResult.quadras)}</span></p>
                                      <p>Quinas (5 acertos): <span className="font-bold text-white">{formatInteger(simulationResult.quinas)}</span></p>
                                      <p>Senas (6 acertos): <span className="font-bold text-white">{formatInteger(simulationResult.senas)}</span></p>
                                    </div>

                                    <div className="mt-4 border-t border-slate-700 pt-4">
                                        <h4 className="font-bold text-slate-300 mb-2">Jogos Premiados</h4>
                                         <div className="flex border-b border-slate-700 mb-2">
                                            {(['sena', 'quina', 'quadra'] as ResultTab[]).map(tab => (
                                                <button key={tab} onClick={() => setActiveTab(tab)} className={`capitalize px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab ? 'border-b-2 border-cyan-400 text-cyan-400' : 'text-slate-400 hover:text-white'}`}>
                                                    {tab} ({formatInteger(simulationResult[`${tab}s` as keyof SimulationResult] as number)})
                                                </button>
                                            ))}
                                        </div>
                                        <div className="max-h-60 overflow-y-auto pr-2">
                                          {(simulationResult[`${activeTab}Jogos` as keyof SimulationResult] as number[][]).length > 0 ? (
                                              <div className="space-y-2">
                                                  {(simulationResult[`${activeTab}Jogos` as keyof SimulationResult] as number[][]).map((game, i) => (
                                                      <div key={i} className="flex flex-wrap gap-1 p-1 bg-slate-900/50 rounded">
                                                          {game.map(n => <GameBall key={n} number={n}/>)}
                                                      </div>
                                                  ))}
                                              </div>
                                          ) : <p className="text-slate-500 text-center py-4">Nenhum jogo premiado nesta categoria.</p>}
                                        </div>
                                         {(simulationResult[`${activeTab}Jogos` as keyof SimulationResult] as number[][]).length > 0 &&
                                          <button onClick={() => downloadCSV(simulationResult[`${activeTab}Jogos` as keyof SimulationResult] as number[][], `Ganhadores_${activeTab}.csv`)} className="mt-4 w-full bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200">
                                             Download {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} CSV
                                         </button>
                                         }
                                    </div>
                                 </div>
                             )}
                         </Card>
                    </div>
                </main>
            </div>
        </div>
    );
}