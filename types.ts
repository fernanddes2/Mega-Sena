
export interface Probabilities {
  sena: number;
  quina: number;
  quadra: number;
}

export interface SimulationResult {
  quadras: number;
  quinas: number;
  senas: number;
  quadraJogos: number[][];
  quinaJogos: number[][];
  senaJogos: number[][];
  sorteioUsado: number[];
}

export type ResultTab = 'sena' | 'quina' | 'quadra';

export interface MegaSenaContest {
  concurso: number;
  data: string;
  dezenas: number[];
}
