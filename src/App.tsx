// src/App.tsx
import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import './App.css';

interface Figurinha {
  id: string;
  numero: number;
  nome: string;
  imagem_url: string;
  raridade: string;
  probabilidade: number;
  curiosidade?: string;
}

interface Questao {
  id: string;
  enunciado: string;
  alternativa_a: string;
  alternativa_b: string;
  alternativa_c: string;
  alternativa_d: string;
  resposta_correta: string;
  descritor_codigo?: string;
  descritor_descricao?: string;
  habilidade_bncc?: string;
  dificuldade: number;
  distratores?: Record<string, string>;
}

interface Progresso {
  figurinhas_obtidas: string[];
  figurinhas_repetidas: Record<string, number>;
  erros_seguidos: number;
  questoes_respondidas?: string[];
}

interface ErroDetalhado {
  pergunta: string;
  questao_id: string;
  descritor: string;
  resposta_aluno: string;
  resposta_correta: string;
  explicacao_erro: string;
}

const ATIVIDADE_ID = '80093822-405a-4be4-807e-202888024ee4';
const TOTAL_FIGURINHAS = 42;
const ALBUM_ID_FIXO = 'bb84b6cb-7a73-4ca9-8f52-22d8863e6e59';

const DESCRITORES_IDS = [
  '3c803e7a-7538-4266-8e34-59fabdc47cfe',
  'b11744ff-667b-4052-94b2-d9728323d62c',
  '26f30312-680d-467b-8f57-8738f007307b',
  'ed9dadcf-a4dd-4986-8a08-78ab97dd9e5f',
  '3ab4265a-b4f8-477b-ae01-d401780ba81b',
  '034b0fa5-d2d0-40d5-8262-373d44eb5291',
  'ec374c8c-5bfc-4a0a-94cc-3765d1941cd4'
];

const DESCRITOR_COD_MAP: Record<string, string> = {
  '3c803e7a-7538-4266-8e34-59fabdc47cfe': 'EF09HI01',
  'b11744ff-667b-4052-94b2-d9728323d62c': 'EF09HI02',
  '26f30312-680d-467b-8f57-8738f007307b': 'EF09HI03',
  'ed9dadcf-a4dd-4986-8a08-78ab97dd9e5f': 'EF09HI04',
  '3ab4265a-b4f8-477b-ae01-d401780ba81b': 'EF09HI17',
  '034b0fa5-d2d0-40d5-8262-373d44eb5291': 'EF09HI19',
  'ec374c8c-5bfc-4a0a-94cc-3765d1941cd4': 'EF09HI20'
};

const DESCRITOR_DESCRICAO_MAP: Record<string, string> = {
  '3c803e7a-7538-4266-8e34-59fabdc47cfe': 'Descrever e contextualizar os principais aspectos sociais, culturais, econômicos e políticos da emergência da República no Brasil.',
  'b11744ff-667b-4052-94b2-d9728323d62c': 'Caracterizar e compreender os ciclos da história republicana, identificando particularidades da história local e regional até 1954.',
  '26f30312-680d-467b-8f57-8738f007307b': 'Identificar os mecanismos de inserção dos negros na sociedade brasileira pós-abolição e avaliar os seus resultados.',
  'ed9dadcf-a4dd-4986-8a08-78ab97dd9e5f': 'Discutir a importância da participação da população negra na formação econômica, política e social do Brasil.',
  '3ab4265a-b4f8-477b-ae01-d401780ba81b': 'Identificar e analisar processos sociais, econômicos, culturais e políticos do Brasil a partir de 1946.',
  '034b0fa5-d2d0-40d5-8262-373d44eb5291': 'Identificar e compreender o processo que resultou na ditadura civil-militar no Brasil e discutir a emergência de questões relacionadas à memória e à justiça sobre os casos de violação dos direitos humanos.',
  'ec374c8c-5bfc-4a0a-94cc-3765d1941cd4': 'Discutir os processos de resistência e as propostas de reorganização da sociedade brasileira durante a ditadura civil-militar.'
};

const DESCRITOR_BNCC_MAP: Record<string, string> = {
  '3c803e7a-7538-4266-8e34-59fabdc47cfe': 'EF09HI01',
  'b11744ff-667b-4052-94b2-d9728323d62c': 'EF09HI02',
  '26f30312-680d-467b-8f57-8738f007307b': 'EF09HI03',
  'ed9dadcf-a4dd-4986-8a08-78ab97dd9e5f': 'EF09HI04',
  '3ab4265a-b4f8-477b-ae01-d401780ba81b': 'EF09HI17',
  '034b0fa5-d2d0-40d5-8262-373d44eb5291': 'EF09HI19',
  'ec374c8c-5bfc-4a0a-94cc-3765d1941cd4': 'EF09HI20'
};

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const alunoId = urlParams.get('aluno_id');
  const turmaId = urlParams.get('turma_id');

  const [loading, setLoading] = useState(true);
  const [alunoNome, setAlunoNome] = useState('Aluno');
  const [escolaNome, setEscolaNome] = useState('');
  const [albumId, setAlbumId] = useState<string>(ALBUM_ID_FIXO);

  const [figurinhas, setFigurinhas] = useState<Figurinha[]>([]);
  const [progresso, setProgresso] = useState<Progresso>({
    figurinhas_obtidas: [],
    figurinhas_repetidas: {},
    erros_seguidos: 0,
    questoes_respondidas: []
  });

  const [filaQuestoes, setFilaQuestoes] = useState<Questao[]>([]);
  const [indiceAtualQuestao, setIndiceAtualQuestao] = useState(0);

  const [alternativaSelecionada, setAlternativaSelecionada] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro' | 'alerta' | 'info'; msg: string } | null>(null);
  const [pacoteAberto, setPacoteAberto] = useState<Figurinha[]>([]);
  const [processando, setProcessando] = useState(false);
  const [albumCompleto, setAlbumCompleto] = useState(false);

  const [acertos, setAcertos] = useState(0);
  const [erros, setErros] = useState(0);
  const [detalhesErrosSession, setDetalhesErrosSession] = useState<ErroDetalhado[]>([]);
  const [tempoInicio, setTempoInicio] = useState<number | null>(null);
  const [registroResultadoEnviado, setRegistroResultadoEnviado] = useState(false);

  const [mostrarModalReset, setMostrarModalReset] = useState(false);

  const [curiosidadeVisivel, setCuriosidadeVisivel] = useState<string | null>(null);

  const albumRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = '🏛️ Álbum dos Presidentes do Brasil - SACI SABIDO';
  }, []);

  useEffect(() => {
    if (alunoId && turmaId) {
      inicializarAtividade();
      setTempoInicio(Date.now());
    } else {
      setFeedback({ tipo: 'erro', msg: 'Acesso inválido. Abra através do sistema Saci Sabido.' });
      setLoading(false);
    }
  }, [alunoId, turmaId]);

  const inicializarAtividade = async () => {
    setLoading(true);
    try {
      // 1. Buscar dados do aluno
      const { data: alunoData } = await supabase.from('alunos').select('nome_aluno, turma_id').eq('id', alunoId).single();
      if (alunoData) {
        setAlunoNome(alunoData.nome_aluno);
        const { data: turmaData } = await supabase.from('turmas').select('escola_id').eq('id', turmaId).single();
        if (turmaData) {
          const { data: escolaData } = await supabase.from('escolas').select('nome').eq('id', turmaData.escola_id).single();
          if (escolaData) setEscolaNome(escolaData.nome);
        }
      }

      const albumIdFixed = ALBUM_ID_FIXO;
      setAlbumId(albumIdFixed);

      // 2. Buscar figurinhas
      const { data: figs } = await supabase
        .from('figurinhas')
        .select('*')
        .eq('album_id', albumIdFixed)
        .eq('ativo', true)
        .order('numero', { ascending: true });
      setFigurinhas(figs || []);

      // 3. Buscar progresso (inclui questoes_respondidas)
      const { data: progData, error: progError } = await supabase
        .from('jogo_figurinhas_progresso')
        .select('*')
        .eq('aluno_id', alunoId)
        .eq('album_id', albumIdFixed)
        .maybeSingle();

      let questoesRespondidasIds: string[] = [];

      if (progError) console.error('Erro ao ler progresso:', progError);

      if (progData) {
        let obtidas = progData.figurinhas_obtidas;
        if (typeof obtidas === 'string') obtidas = JSON.parse(obtidas);
        let repetidas = progData.figurinhas_repetidas;
        if (typeof repetidas === 'string') repetidas = JSON.parse(repetidas);
        let respondidas = progData.questoes_respondidas || [];
        if (typeof respondidas === 'string') respondidas = JSON.parse(respondidas);
        questoesRespondidasIds = Array.isArray(respondidas) ? respondidas : [];

        setProgresso({
          figurinhas_obtidas: Array.isArray(obtidas) ? obtidas : [],
          figurinhas_repetidas: (repetidas && typeof repetidas === 'object') ? repetidas : {},
          erros_seguidos: progData.erros_seguidos || 0,
          questoes_respondidas: questoesRespondidasIds
        });
        if (Array.isArray(obtidas) && obtidas.length === TOTAL_FIGURINHAS) setAlbumCompleto(true);
      } else {
        // Se não existir progresso, cria um novo
        const { error: insertError } = await supabase
          .from('jogo_figurinhas_progresso')
          .insert({
            aluno_id: alunoId,
            album_id: albumIdFixed,
            figurinhas_obtidas: [],
            figurinhas_repetidas: {},
            erros_seguidos: 0,
            questoes_respondidas: []
          });
        if (insertError) console.error('Erro ao criar progresso:', insertError);
      }

      // 4. Buscar questões filtrando as que já foram respondidas
      let query = supabase
        .from('jogo_figurinhas_questoes')
        .select(`id, enunciado, alternativa_a, alternativa_b, alternativa_c, alternativa_d, resposta_correta, dificuldade, distratores, descritor_id`)
        .eq('album_id', albumIdFixed)
        .eq('ativo', true)
        .in('descritor_id', DESCRITORES_IDS);

      if (questoesRespondidasIds.length > 0) {
        const filterIds = `(${questoesRespondidasIds.join(',')})`;
        query = query.not('id', 'in', filterIds);
      }

      const { data: todasQuestoes, error } = await query;

      if (error) {
        console.error('Erro ao buscar questões:', error);
        setFeedback({ tipo: 'erro', msg: 'Erro ao carregar questões. Contate o suporte.' });
        setLoading(false);
        return;
      }

      if (!todasQuestoes || todasQuestoes.length === 0) {
        setFeedback({ tipo: 'info', msg: '🎉 Você já respondeu todas as questões disponíveis! Parabéns!' });
        setLoading(false);
        return;
      }

      const questoesComDescritor = todasQuestoes.map(q => ({
        ...q,
        descritor_codigo: DESCRITOR_COD_MAP[q.descritor_id] || 'Geral',
        descritor_descricao: DESCRITOR_DESCRICAO_MAP[q.descritor_id] || '',
        habilidade_bncc: DESCRITOR_BNCC_MAP[q.descritor_id] || 'EF00HI00'
      }));

      const shuffled = [...questoesComDescritor];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setFilaQuestoes(shuffled);
      setIndiceAtualQuestao(0);
      setProcessando(false);

    } catch (error) {
      console.error("Erro ao inicializar atividade:", error);
      setFeedback({ tipo: 'erro', msg: 'Erro ao carregar dados da atividade. Tente novamente.' });
    } finally {
      setLoading(false);
    }
  };

  const avancarParaProximaQuestao = () => {
    if (indiceAtualQuestao + 1 < filaQuestoes.length) {
      setIndiceAtualQuestao(prev => prev + 1);
      setAlternativaSelecionada(null);
      setProcessando(false);
    } else {
      const novaFila = [...filaQuestoes];
      for (let i = novaFila.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [novaFila[i], novaFila[j]] = [novaFila[j], novaFila[i]];
      }
      setFilaQuestoes(novaFila);
      setIndiceAtualQuestao(0);
      setAlternativaSelecionada(null);
      setProcessando(false);
      setFeedback({ tipo: 'info', msg: '🔄 Você completou todas as questões! Recomeçando a lista.' });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const sortearFigurinhaComGarantia = (garantirNova: boolean, excluirIds: string[] = []): Figurinha => {
    const comuns = figurinhas.filter(f => f.raridade === 'comum' && !excluirIds.includes(f.id));
    const brilhantes = figurinhas.filter(f => f.raridade === 'brilhante' && !excluirIds.includes(f.id));
    const lendarias = figurinhas.filter(f => f.raridade === 'lendaria' && !excluirIds.includes(f.id));

    const rand = Math.random() * 100;
    let raridadeAlvo = 'comum';
    if (rand < 66.7) raridadeAlvo = 'comum';
    else if (rand < 87.5) raridadeAlvo = 'brilhante';
    else raridadeAlvo = 'lendaria';

    let disponiveis: Figurinha[] = [];
    if (raridadeAlvo === 'comum') disponiveis = comuns.filter(f => !progresso.figurinhas_obtidas.includes(f.id));
    else if (raridadeAlvo === 'brilhante') disponiveis = brilhantes.filter(f => !progresso.figurinhas_obtidas.includes(f.id));
    else disponiveis = lendarias.filter(f => !progresso.figurinhas_obtidas.includes(f.id));

    if (garantirNova && disponiveis.length > 0) {
      return disponiveis[Math.floor(Math.random() * disponiveis.length)];
    } else if (disponiveis.length > 0) {
      return disponiveis[Math.floor(Math.random() * disponiveis.length)];
    } else {
      let todas: Figurinha[] = [];
      if (raridadeAlvo === 'comum') todas = comuns;
      else if (raridadeAlvo === 'brilhante') todas = brilhantes;
      else todas = lendarias;

      if (todas.length === 0) {
        const todasGeral = figurinhas.filter(f => f.raridade === raridadeAlvo);
        return { ...todasGeral[Math.floor(Math.random() * todasGeral.length)], raridade: 'repetida' };
      }
      return { ...todas[Math.floor(Math.random() * todas.length)], raridade: 'repetida' };
    }
  };

  const salvarResposta = async (questao: Questao, acertou: boolean, respostaAluno?: string) => {
    if (!alunoId || !turmaId) return;
    const tempoDecorrido = tempoInicio ? Math.floor((Date.now() - tempoInicio) / 1000) : 0;

    const explicacao = questao.distratores?.[respostaAluno || ''] || `Erro conceitual. A alternativa correta é ${questao.resposta_correta}. Revise o descritor: ${questao.descritor_descricao || ""}`;

    const novosErros = acertou ? [] : [{
      pergunta: questao.enunciado,
      questao_id: questao.id,
      descritor: questao.descritor_codigo || 'Geral',
      resposta_aluno: respostaAluno || '',
      resposta_correta: questao.resposta_correta,
      explicacao_erro: explicacao
    }];

    const dadosResultado = {
      aluno_id: alunoId,
      jogo_id: ATIVIDADE_ID,
      turma_id: turmaId,
      acertos: acertou ? 1 : 0,
      erros: acertou ? 0 : 1,
      tempo_segundos: tempoDecorrido,
      total_questoes: 1,
      habilidade_bncc: questao.habilidade_bncc || 'EF00HI00',
      detalhes_erros: novosErros
    };
    await supabase.from('resultados').insert([dadosResultado]);
  };

  const salvarResultadoParcial = async (bncc: string) => {
    if (!alunoId || !turmaId || registroResultadoEnviado) return;
    const dadosResultado = {
      aluno_id: alunoId,
      jogo_id: ATIVIDADE_ID,
      turma_id: turmaId,
      acertos: acertos,
      erros: erros,
      tempo_segundos: tempoInicio ? Math.floor((Date.now() - tempoInicio) / 1000) : 0,
      total_questoes: acertos + erros,
      habilidade_bncc: bncc || 'EF00HI00',
      detalhes_erros: detalhesErrosSession
    };
    await supabase.from('resultados').insert([dadosResultado]);
    setRegistroResultadoEnviado(true);
  };

  const confirmarReset = async () => {
    if (!alunoId || !albumId) return;
    setMostrarModalReset(false);

    await supabase.from('jogo_figurinhas_progresso').update({
      figurinhas_obtidas: [],
      figurinhas_repetidas: {},
      erros_seguidos: 0,
      questoes_respondidas: []
    }).eq('aluno_id', alunoId).eq('album_id', albumId);

    setFeedback({ tipo: 'info', msg: '♻️ Progresso zerado! Você pode recomeçar sua coleção.' });
    setTimeout(() => window.location.reload(), 1500);
  };

  const handleResposta = async (respostaAluno: string) => {
    const questaoAtualObj = filaQuestoes[indiceAtualQuestao];
    if (!questaoAtualObj || !alunoId || !albumId || processando) return;

    setProcessando(true);
    setAlternativaSelecionada(respostaAluno);

    const acertou = respostaAluno === questaoAtualObj.resposta_correta;
    let novoProgresso = { ...progresso };
    let novasFigurinhas: Figurinha[] = [];

    if (acertou) {
      setAcertos(prev => prev + 1);
      setFeedback({ tipo: 'sucesso', msg: '🎉 Resposta correta! Você ganhou 2 figurinhas!' });
      novoProgresso.erros_seguidos = 0;

      const totalFaltando = TOTAL_FIGURINHAS - novoProgresso.figurinhas_obtidas.length;
      const primeira = sortearFigurinhaComGarantia(totalFaltando > 0, []);
      const segunda = sortearFigurinhaComGarantia(false, [primeira.id]);
      novasFigurinhas = [primeira, segunda];

      if (primeira.raridade !== 'repetida' && !novoProgresso.figurinhas_obtidas.includes(primeira.id)) {
        novoProgresso.figurinhas_obtidas = [...novoProgresso.figurinhas_obtidas, primeira.id];
      } else {
        const idFig = primeira.id;
        novoProgresso.figurinhas_repetidas = { ...novoProgresso.figurinhas_repetidas, [idFig]: (novoProgresso.figurinhas_repetidas[idFig] || 0) + 1 };
      }

      if (segunda.raridade !== 'repetida' && !novoProgresso.figurinhas_obtidas.includes(segunda.id)) {
        novoProgresso.figurinhas_obtidas = [...novoProgresso.figurinhas_obtidas, segunda.id];
      } else {
        const idFig = segunda.id;
        novoProgresso.figurinhas_repetidas = { ...novoProgresso.figurinhas_repetidas, [idFig]: (novoProgresso.figurinhas_repetidas[idFig] || 0) + 1 };
      }

    } else {
      setErros(prev => prev + 1);
      const explicacao = questaoAtualObj.distratores?.[respostaAluno] || `Erro conceitual. A alternativa correta é ${questaoAtualObj.resposta_correta}. Revise o descritor: ${questaoAtualObj.descritor_descricao}`;

      setDetalhesErrosSession(prev => [...prev, {
        pergunta: questaoAtualObj.enunciado,
        questao_id: questaoAtualObj.id,
        descritor: questaoAtualObj.descritor_codigo || 'Geral',
        resposta_aluno: respostaAluno,
        resposta_correta: questaoAtualObj.resposta_correta,
        explicacao_erro: explicacao
      }]);

      const totalRepetidas = Object.values(novoProgresso.figurinhas_repetidas).reduce((s, q) => s + (typeof q === 'number' ? q : 0), 0);
      if (totalRepetidas > 0) {
        const idRep = Object.keys(novoProgresso.figurinhas_repetidas).find(id => novoProgresso.figurinhas_repetidas[id] > 0)!;
        const novaQtd = novoProgresso.figurinhas_repetidas[idRep] - 1;
        const novasRepetidas = { ...novoProgresso.figurinhas_repetidas };
        if (novaQtd === 0) delete novasRepetidas[idRep]; else novasRepetidas[idRep] = novaQtd;
        novoProgresso.figurinhas_repetidas = novasRepetidas;
        setFeedback({ tipo: 'alerta', msg: '🛡️ Resposta incorreta. Usou uma figurinha repetida como escudo!' });
        novoProgresso.erros_seguidos = 0;
      } else {
        novoProgresso.erros_seguidos += 1;
        if (novoProgresso.erros_seguidos >= 3) {
          if (novoProgresso.figurinhas_obtidas.length > 0) {
            const novasObtidas = [...novoProgresso.figurinhas_obtidas];
            novasObtidas.pop();
            novoProgresso.figurinhas_obtidas = novasObtidas;
            setFeedback({ tipo: 'erro', msg: '⚠️ 3 erros seguidos! Você perdeu uma figurinha.' });
          } else {
            setFeedback({ tipo: 'erro', msg: '❌ Resposta incorreta. Revise o conteúdo.' });
          }
          novoProgresso.erros_seguidos = 0;
        } else {
          setFeedback({ tipo: 'erro', msg: `❌ Errado. ${novoProgresso.erros_seguidos}/3. Leia a explicação abaixo.` });
        }
      }
    }

    const novasRespondidas = [...(novoProgresso.questoes_respondidas || []), questaoAtualObj.id];

    setProgresso({
      ...novoProgresso,
      questoes_respondidas: novasRespondidas
    });

    await supabase.from('jogo_figurinhas_progresso').update({
      figurinhas_obtidas: novoProgresso.figurinhas_obtidas,
      figurinhas_repetidas: novoProgresso.figurinhas_repetidas,
      erros_seguidos: novoProgresso.erros_seguidos,
      data_ultimo_acesso: new Date().toISOString(),
      questoes_respondidas: novasRespondidas
    }).eq('aluno_id', alunoId).eq('album_id', albumId);

    await salvarResposta(questaoAtualObj, acertou, respostaAluno);

    if (novoProgresso.figurinhas_obtidas.length === TOTAL_FIGURINHAS && !albumCompleto) {
      setAlbumCompleto(true);
      await salvarResultadoParcial(questaoAtualObj.habilidade_bncc || 'EF00HI00');
    }

    if (novasFigurinhas.length > 0 && acertou) {
      setTimeout(() => setPacoteAberto(novasFigurinhas), 1500);
      setTimeout(() => {
        setPacoteAberto([]);
        setFeedback(null);
        avancarParaProximaQuestao();
      }, 5000);
    } else if (acertou) {
      setTimeout(() => {
        setFeedback(null);
        avancarParaProximaQuestao();
      }, 2000);
    }
  };

  const concluirAtividade = () => {
    window.close();
  };

  if (loading) return <div className="loading-state"><div className="loading-spinner"></div><p>Carregando atividade...</p></div>;

  const questaoAtualObj = filaQuestoes[indiceAtualQuestao];
  const totalRepetidas = progresso.figurinhas_repetidas && typeof progresso.figurinhas_repetidas === 'object'
    ? Object.values(progresso.figurinhas_repetidas).reduce((s, q) => s + (typeof q === 'number' ? q : 0), 0)
    : 0;
  const percentual = TOTAL_FIGURINHAS > 0 ? (progresso.figurinhas_obtidas.length / TOTAL_FIGURINHAS) * 100 : 0;

  return (
    <div 
      className="album-copa-container"
      onClick={() => setCuriosidadeVisivel(null)}
    >
      {mostrarModalReset && (
        <div className="pacote-overlay">
          <div className="pacote-conteudo" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '10px' }}>🔄 Recomeçar Álbum</h2>
            <p style={{ fontSize: '1rem', color: '#555' }}>
              Tem certeza que deseja recomeçar todo o progresso?<br />
              Suas figurinhas e estatísticas serão <strong>zeradas</strong>.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px' }}>
              <button
                onClick={() => setMostrarModalReset(false)}
                className="btn-concluir"
                style={{ backgroundColor: '#ccc', color: '#000', padding: '12px 24px', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarReset}
                className="btn-concluir"
                style={{ backgroundColor: '#ef4444', color: '#fff', padding: '12px 24px', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Sim, recomeçar
              </button>
            </div>
          </div>
        </div>
      )}

      {albumCompleto && (
        <div className="album-completo-card">
          <div className="card-header">✨ Parabéns! Álbum completo</div>
          <div className="card-buttons">
            <button onClick={concluirAtividade} className="btn-concluir">Concluir atividade</button>
          </div>
        </div>
      )}

      {questaoAtualObj && pacoteAberto.length === 0 && !albumCompleto && (
        <div className="questao-card">
          <div className="questao-header">
            <span className="descritor-badge" title={questaoAtualObj.descritor_descricao}>
              📚 Descritor: {questaoAtualObj.descritor_codigo}
            </span>
            <span>{'⭐'.repeat(questaoAtualObj.dificuldade || 1)}</span>
          </div>
          {questaoAtualObj.descritor_descricao && (
            <div className="descritor-descricao">
              <strong>Objetivo de aprendizagem:</strong> {questaoAtualObj.descritor_descricao}
            </div>
          )}
          <p className="enunciado">{questaoAtualObj.enunciado}</p>
          <div className="alternativas">
            {['A', 'B', 'C', 'D'].map(letra => {
              const texto = questaoAtualObj[`alternativa_${letra.toLowerCase()}` as keyof Questao] as string;
              let classe = '';
              if (alternativaSelecionada) {
                if (letra === questaoAtualObj.resposta_correta) classe = 'correta';
                else if (letra === alternativaSelecionada) classe = 'errada';
              }
              return (
                <button key={letra} className={`alt-btn ${classe}`} onClick={() => handleResposta(letra)} disabled={!!alternativaSelecionada}>
                  <span className="alt-letra">{letra}</span>
                  <span className="alt-texto">{texto}</span>
                </button>
              );
            })}
          </div>
          {alternativaSelecionada && alternativaSelecionada !== questaoAtualObj.resposta_correta && (
            <div className="feedback-pedagogico" style={{ marginTop: '15px', padding: '10px', backgroundColor: '#fef2f2', borderLeft: '4px solid #ef4444', borderRadius: '4px', fontSize: '0.9em' }}>
              <strong>💡 Explicação do erro:</strong> {questaoAtualObj.distratores?.[alternativaSelecionada] || `A alternativa correta é ${questaoAtualObj.resposta_correta}. Revise o conceito abordado no descritor.`}
              <br />
              <button
                onClick={() => {
                  setFeedback(null);
                  avancarParaProximaQuestao();
                }}
                style={{
                  marginTop: '10px',
                  padding: '6px 16px',
                  backgroundColor: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.85rem'
                }}
              >
                Entendi, próxima questão →
              </button>
            </div>
          )}
        </div>
      )}

      {feedback && pacoteAberto.length === 0 && (
        <div className={`feedback-msg ${feedback.tipo}`}>
          {feedback.msg}
        </div>
      )}

      <div className="album-stats">
        <div className="stat-item"><div className="stat-label">Acertos</div><div className="stat-value">{acertos}</div></div>
        <div className="stat-item"><div className="stat-label">Erros</div><div className="stat-value">{erros}</div></div>
        <div className="stat-item"><div className="stat-label">Únicas</div><div className="stat-value">{progresso.figurinhas_obtidas.length}/{TOTAL_FIGURINHAS}</div></div>
        <div className="stat-item"><div className="stat-label">Repetidas</div><div className="stat-value">{totalRepetidas}</div></div>
        <div className="stat-item"><div className="stat-label">Erros Seguidos</div><div className="stat-value">{progresso.erros_seguidos}/3</div></div>
      </div>

      <div className="progress-container">
        <div className="progress-label">Progresso da Atividade: {Math.round(percentual)}%</div>
        <div className="progress-bar"><div className="progress-fill" style={{ width: `${percentual}%` }}></div></div>
      </div>

      <div ref={albumRef} className="area-para-captura">
        <div className="album-header-captura">
          <h1>🏛️ Álbum dos Presidentes do Brasil - SACI SABIDO</h1>
          <div className="info-captura">
            <p><strong>Aluno:</strong> {alunoNome}</p>
            {escolaNome && <p><strong>Escola:</strong> {escolaNome}</p>}
          </div>
        </div>

        <div style={{ textAlign: 'center', margin: '12px 0 20px', fontSize: '0.9rem', color: '#6b7280', fontStyle: 'italic' }}>
          🖱️ Passe o mouse ou toque em uma figurinha <strong>já obtida</strong> para saber curiosidades sobre ela.
        </div>

        <div className="album-grid" style={{ overflow: 'visible' }}>
          {figurinhas.length === 0 ? (
            <div className="col-span-full text-center py-10 text-slate-500">
              Nenhuma figurinha cadastrada para este álbum.
            </div>
          ) : (
            figurinhas.map(fig => {
              const obtida = progresso.figurinhas_obtidas.includes(fig.id);
              const rep = progresso.figurinhas_repetidas[fig.id] || 0;
              const isVisivel = curiosidadeVisivel === fig.id;

              return (
                <div
                  key={fig.id}
                  className={`figurinha-slot ${obtida ? 'obtida' : 'vazia'}`}
                  style={{
                    position: 'relative',
                    cursor: obtida ? 'pointer' : 'default',
                    zIndex: isVisivel ? 20 : 1,
                    overflow: 'visible',
                  }}
                  onMouseEnter={() => {
                    if (obtida && fig.curiosidade) setCuriosidadeVisivel(fig.id);
                  }}
                  onMouseLeave={() => setCuriosidadeVisivel(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (obtida && fig.curiosidade) {
                      setCuriosidadeVisivel(isVisivel ? null : fig.id);
                    }
                  }}
                >
                  {obtida ? (
                    <>
                      <img
                        src={fig.imagem_url}
                        alt={fig.nome}
                        crossOrigin="anonymous"
                        style={{ position: 'relative', zIndex: 1 }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://placehold.co/100x130/fde68a/92400e?text=${fig.numero}`;
                        }}
                      />
                      {rep > 0 && <span className="badge-repetida">+{rep}</span>}
                    </>
                  ) : (
                    <span className="numero-vazio">{fig.numero}</span>
                  )}

                  {isVisivel && fig.curiosidade && obtida && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 'calc(100% + 12px)',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: 'white',
                        color: '#1f2937',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
                        fontSize: '0.85rem',
                        maxWidth: '220px',
                        width: 'max-content',
                        textAlign: 'center',
                        zIndex: 30,
                        lineHeight: 1.5,
                        fontWeight: '500',
                        pointerEvents: 'none',
                      }}
                    >
                      {fig.curiosidade}
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '-7px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: 0,
                          height: 0,
                          borderLeft: '8px solid transparent',
                          borderRight: '8px solid transparent',
                          borderTop: '8px solid white',
                          filter: 'drop-shadow(0 2px 1px rgba(0,0,0,0.05))',
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {pacoteAberto.length > 0 && (
        <div className="pacote-overlay">
          <div className="pacote-conteudo">
            <h2>🎉 Você avançou na atividade e ganhou figurinhas!</h2>
            <div className="figurinhas-reveladas">
              {pacoteAberto.map((fig, i) => {
                const ehNova = !progresso.figurinhas_obtidas.includes(fig.id);
                return (
                  <div key={i} className="figurinha-revelada" style={{ animationDelay: `${i * 0.3}s` }}>
                    <img
                      src={fig.imagem_url}
                      alt={fig.nome}
                      crossOrigin="anonymous"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://placehold.co/100x130/fde68a/92400e?text=${fig.numero}`;
                      }}
                    />
                    <div className="tag">{fig.raridade === 'repetida' ? '🔄 REPETIDA' : '✨ NOVA!'}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: '20px', marginBottom: '40px' }}>
        <button
          onClick={() => setMostrarModalReset(true)}
          style={{
            background: 'none',
            border: '1px solid #ef4444',
            color: '#ef4444',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.9em',
            fontWeight: 'bold',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#ef4444';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#ef4444';
          }}
        >
          🔄 Recomeçar Álbum
        </button>
      </div>
    </div>
  );
}
// src/App.tsx
