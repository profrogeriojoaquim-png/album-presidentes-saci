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
}

interface ErroDetalhado {
  pergunta: string;
  questao_id: string;
  descritor: string;
  resposta_aluno: string;
  resposta_correta: string;
  explicacao_erro: string;
}

const ATIVIDADE_ID = 'a1b2c3d4-e5f6-4789-a0b1-c2d3e4f5a6b7';
const TOTAL_FIGURINHAS = 45;
const ALBUM_ID_FIXO = '80093822-405a-4be4-807e-202888024ee4';

// IDs reais dos descritores BNCC para 9º ano de História
const DESCRITORES_IDS = [
  '3c803e7a-7538-4266-8e34-59fabdc47cfe', // EF09HI01
  'b11744ff-667b-4052-94b2-d9728323d62c', // EF09HI02
  '26f30312-680d-467b-8f57-8738f007307b', // EF09HI03
  'ed9dadcf-a4dd-4986-8a08-78ab97dd9e5f', // EF09HI04
  '3ab4265a-b4f8-477b-ae01-d401780ba81b', // EF09HI17
  '034b0fa5-d2d0-40d5-8262-373d44eb5291', // EF09HI19
  'ec374c8c-5bfc-4a0a-94cc-3765d1941cd4'  // EF09HI20
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
  const [progresso, setProgresso] = useState<Progresso>({ figurinhas_obtidas: [], figurinhas_repetidas: {}, erros_seguidos: 0 });

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

  const albumRef = useRef<HTMLDivElement>(null);

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

      // 2. Usar o ID fixo do álbum
      const albumIdFixed = ALBUM_ID_FIXO;
      setAlbumId(albumIdFixed);

      // 3. Buscar figurinhas
      const { data: figs } = await supabase
        .from('figurinhas')
        .select('*')
        .eq('album_id', albumIdFixed)
        .eq('ativo', true)
        .order('numero', { ascending: true });

      setFigurinhas(figs || []); // se não houver, array vazio

      // 4. Buscar progresso do aluno (usando maybeSingle para evitar erro 406)
      const { data: progData, error: progError } = await supabase
        .from('jogo_figurinhas_progresso')
        .select('*')
        .eq('aluno_id', alunoId)
        .eq('album_id', albumIdFixed)
        .maybeSingle();

      if (progError && progError.code !== 'PGRST116') {
        console.error('Erro ao buscar progresso:', progError);
      }

      if (progData) {
        let obtidas = progData.figurinhas_obtidas;
        if (typeof obtidas === 'string') obtidas = JSON.parse(obtidas);
        let repetidas = progData.figurinhas_repetidas;
        if (typeof repetidas === 'string') repetidas = JSON.parse(repetidas);
        setProgresso({
          figurinhas_obtidas: Array.isArray(obtidas) ? obtidas : [],
          figurinhas_repetidas: (repetidas && typeof repetidas === 'object') ? repetidas : {},
          erros_seguidos: progData.erros_seguidos || 0
        });
        if (obtidas?.length === TOTAL_FIGURINHAS) setAlbumCompleto(true);
      } else {
        // Inserir progresso com upsert para evitar erro 409
        const { error: insertError } = await supabase
          .from('jogo_figurinhas_progresso')
          .upsert({
            aluno_id: alunoId,
            album_id: albumIdFixed,
            figurinhas_obtidas: [],
            figurinhas_repetidas: {},
            erros_seguidos: 0
          }, { onConflict: 'aluno_id, album_id' });

        if (insertError) {
          console.error('Erro ao inserir progresso:', insertError);
        }
      }

      // 5. Buscar questões
      const { data: todasQuestoes, error } = await supabase
        .from('jogo_figurinhas_questoes')
        .select(`id, enunciado, alternativa_a, alternativa_b, alternativa_c, alternativa_d, resposta_correta, dificuldade, distratores, descritor_id`)
        .eq('album_id', albumIdFixed)
        .eq('ativo', true)
        .in('descritor_id', DESCRITORES_IDS);

      if (error) {
        console.error('Erro ao buscar questões:', error);
        setFeedback({ tipo: 'erro', msg: 'Erro ao carregar questões. Contate o suporte.' });
        setLoading(false);
        return;
      }

      if (!todasQuestoes || todasQuestoes.length === 0) {
        setFeedback({ tipo: 'erro', msg: 'Nenhuma questão encontrada para esta atividade. Contate o suporte.' });
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

  const sortearFigurinhaComGarantia = (garantirNova: boolean): Figurinha => {
    const comuns = figurinhas.filter(f => f.raridade === 'comum');
    const brilhantes = figurinhas.filter(f => f.raridade === 'brilhante');
    const lendarias = figurinhas.filter(f => f.raridade === 'lendaria');

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
      aluno_id: alunoId, jogo_id: ATIVIDADE_ID, turma_id: turmaId,
      acertos: acertos, erros: erros, tempo_segundos: tempoInicio ? Math.floor((Date.now() - tempoInicio) / 1000) : 0,
      total_questoes: acertos + erros, habilidade_bncc: bncc || 'EF00HI00', detalhes_erros: detalhesErrosSession
    };
    const { error } = await supabase.from('resultados').insert([dadosResultado]);
    if (error) console.error('Erro ao salvar resultado da atividade:', error);
    setRegistroResultadoEnviado(true);
  };

  const confirmarReset = async () => {
    if (!alunoId || !albumId) return;
    setMostrarModalReset(false);

    await supabase.from('jogo_figurinhas_progresso').update({
      figurinhas_obtidas: [],
      figurinhas_repetidas: {},
      erros_seguidos: 0
    }).eq('aluno_id', alunoId).eq('album_id', albumId);

    setFeedback({ tipo: 'info', msg: 'Progresso reiniciado com sucesso.' });
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
      setFeedback({ tipo: 'sucesso', msg: `🎉 Resposta correta! Você avançou na atividade e ganhou 2 figurinhas.` });
      novoProgresso.erros_seguidos = 0;

      const totalFaltando = TOTAL_FIGURINHAS - novoProgresso.figurinhas_obtidas.length;
      const primeira = sortearFigurinhaComGarantia(totalFaltando > 0);
      const segunda = sortearFigurinhaComGarantia(false);
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
        setFeedback({ tipo: 'alerta', msg: `🛡️ Resposta incorreta. Você usou uma figurinha repetida como escudo de proteção.` });
        novoProgresso.erros_seguidos = 0;
      } else {
        novoProgresso.erros_seguidos += 1;
        if (novoProgresso.erros_seguidos >= 3) {
          if (novoProgresso.figurinhas_obtidas.length > 0) {
            const novasObtidas = [...novoProgresso.figurinhas_obtidas];
            novasObtidas.pop();
            novoProgresso.figurinhas_obtidas = novasObtidas;
            setFeedback({ tipo: 'erro', msg: `⚠️ 3 erros seguidos. Você perdeu uma figurinha. Revise o conteúdo com atenção.` });
          } else {
            setFeedback({ tipo: 'erro', msg: `❌ Resposta incorreta. Revise o conteúdo e o descritor da habilidade.` });
          }
          novoProgresso.erros_seguidos = 0;
        } else {
          setFeedback({ tipo: 'erro', msg: `❌ Resposta incorreta. Erro ${novoProgresso.erros_seguidos}/3. Leia a explicação do erro.` });
        }
      }
    }

    setProgresso(novoProgresso);
    await supabase.from('jogo_figurinhas_progresso').update({
      figurinhas_obtidas: JSON.stringify(novoProgresso.figurinhas_obtidas),
      figurinhas_repetidas: JSON.stringify(novoProgresso.figurinhas_repetidas),
      erros_seguidos: novoProgresso.erros_seguidos,
      data_ultimo_acesso: new Date().toISOString()
    }).eq('aluno_id', alunoId).eq('album_id', albumId);

    await salvarResposta(questaoAtualObj, acertou, respostaAluno);

    if (novoProgresso.figurinhas_obtidas.length === TOTAL_FIGURINHAS && !albumCompleto) {
      setAlbumCompleto(true);
      await salvarResultadoParcial(questaoAtualObj.habilidade_bncc || 'EF00HI00');
    }

    if (novasFigurinhas.length > 0) {
      setTimeout(() => setPacoteAberto(novasFigurinhas), 1500);
      setTimeout(() => {
        setPacoteAberto([]);
        setFeedback(null);
        avancarParaProximaQuestao();
      }, 5000);
    } else {
      setTimeout(() => {
        setFeedback(null);
        avancarParaProximaQuestao();
      }, 3500);
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
    <div className="album-copa-container">

      {mostrarModalReset && (
        <div className="pacote-overlay">
          <div className="pacote-conteudo" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <h2>⚠️ Atenção</h2>
            <p>Tem certeza que deseja reiniciar todo o progresso desta atividade? Esta ação não pode ser desfeita.</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
              <button onClick={() => setMostrarModalReset(false)} className="btn-concluir" style={{ backgroundColor: '#ccc', color: '#000' }}>Cancelar</button>
              <button onClick={confirmarReset} className="btn-concluir" style={{ backgroundColor: '#ef4444', color: '#fff' }}>Sim, reiniciar</button>
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
            </div>
          )}
        </div>
      )}

      {feedback && pacoteAberto.length === 0 && <div className={`feedback-msg ${feedback.tipo}`}>{feedback.msg}</div>}

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
        <div className="album-grid">
          {figurinhas.length === 0 ? (
            <div className="col-span-full text-center py-10 text-slate-500">
              Nenhuma figurinha cadastrada para este álbum.
            </div>
          ) : (
            figurinhas.map(fig => {
              const obtida = progresso.figurinhas_obtidas.includes(fig.id);
              const rep = progresso.figurinhas_repetidas[fig.id] || 0;
              return (
                <div key={fig.id} className={`figurinha-slot ${obtida ? 'obtida' : 'vazia'}`}>
                  {obtida ? (
                    <>
                      <img
                        src={fig.imagem_url || `https://placehold.co/100x130/fde68a/92400e?text=Fig+${fig.numero}`}
                        alt={fig.nome}
                        crossOrigin="anonymous"
                        onError={(e) => (e.target as HTMLImageElement).src = `https://placehold.co/100x130/fde68a/92400e?text=Fig+${fig.numero}`}
                      />
                      {rep > 0 && <span className="badge-repetida">+{rep}</span>}
                    </>
                  ) : <span className="numero-vazio">{fig.numero}</span>}
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
              {pacoteAberto.map((fig, i) => (
                <div key={i} className="figurinha-revelada" style={{ animationDelay: `${i * 0.3}s` }}>
                  <img
                    src={fig.imagem_url || `https://placehold.co/100x130/fde68a/92400e?text=Fig+${fig.numero}`}
                    alt={fig.nome}
                    crossOrigin="anonymous"
                    onError={(e) => (e.target as HTMLImageElement).src = `https://placehold.co/100x130/fde68a/92400e?text=Fig+${fig.numero}`}
                  />
                  <div className="tag">{fig.raridade === 'repetida' ? '🔄 REPETIDA' : '✨ NOVA!'}</div>
                  {fig.curiosidade && fig.raridade !== 'repetida' && (
                    <div className="curiosidade-texto" style={{ fontSize: '0.8em', marginTop: '5px', color: '#555', fontStyle: 'italic' }}>
                      "{fig.curiosidade.substring(0, 80)}..."
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: '20px', marginBottom: '40px' }}>
        <button onClick={() => setMostrarModalReset(true)} style={{ background: 'none', border: 'none', color: '#ef4444', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.9em' }}>
          Reiniciar progresso da atividade
        </button>
      </div>
    </div>
  );
}
// src/App.tsx
